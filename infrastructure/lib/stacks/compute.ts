import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as neptune from 'aws-cdk-lib/aws-neptune';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface ComputeStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  rdsInstance: rds.DatabaseInstance;
  neptuneCluster: neptune.DatabaseCluster;
  env: {
    account: string;
    region: string;
  };
}

export class ComputeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    // Create ECR repositories
    const metadataRepo = new ecr.Repository(this, 'MetadataApiRepo', {
      repositoryName: 'movie-graph/metadata-api',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const graphRepo = new ecr.Repository(this, 'GraphApiRepo', {
      repositoryName: 'movie-graph/graph-api',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create secrets for database credentials
    const rdsSecret = new secretsmanager.Secret(this, 'RDSCredentials', {
      secretStringValue: cdk.SecretValue.unsafePlainText(JSON.stringify({
        username: props.rdsInstance.secret?.secretValueFromJson('username').toString(),
        password: props.rdsInstance.secret?.secretValueFromJson('password').toString(),
        host: props.rdsInstance.instanceEndpoint.hostname,
        port: props.rdsInstance.instanceEndpoint.port,
        database: 'movie_metadata',
      })),
    });

    // Create Lambda functions
    const metadataFunction = new lambda.DockerImageFunction(this, 'MetadataFunction', {
      code: lambda.DockerImageCode.fromEcr(metadataRepo),
      vpc: props.vpc,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: 'production',
      },
      securityGroups: [
        new ec2.SecurityGroup(this, 'MetadataLambdaSG', {
          vpc: props.vpc,
          description: 'Security group for Metadata Lambda',
          allowAllOutbound: true,
        }),
      ],
    });

    const graphFunction = new lambda.DockerImageFunction(this, 'GraphFunction', {
      code: lambda.DockerImageCode.fromEcr(graphRepo),
      vpc: props.vpc,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: 'production',
        NEPTUNE_ENDPOINT: props.neptuneCluster.clusterEndpoint.hostname,
        NEPTUNE_PORT: props.neptuneCluster.clusterEndpoint.port.toString(),
      },
      securityGroups: [
        new ec2.SecurityGroup(this, 'GraphLambdaSG', {
          vpc: props.vpc,
          description: 'Security group for Graph Lambda',
          allowAllOutbound: true,
        }),
      ],
    });

    // Grant access to secrets
    rdsSecret.grantRead(metadataFunction);

    // Allow functions to access databases
    props.rdsInstance.connections.allowFrom(
      metadataFunction,
      ec2.Port.tcp(5432),
      'Allow Metadata Lambda to access RDS'
    );

    props.neptuneCluster.connections.allowFrom(
      graphFunction,
      ec2.Port.tcp(8182),
      'Allow Graph Lambda to access Neptune'
    );

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'MovieGraphApi', {
      restApiName: 'Movie Graph API',
      description: 'API Gateway for Movie Graph services',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Create API resources
    const metadata = api.root.addResource('metadata');
    metadata.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(metadataFunction),
    });

    const graph = api.root.addResource('graph');
    graph.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(graphFunction),
    });

    // Output API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });
  }
} 