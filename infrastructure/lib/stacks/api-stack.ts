import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as neptune from 'aws-cdk-lib/aws-neptune';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';

export interface ApiStackProps extends cdk.StackProps {
  stage: string;
}

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Create VPC for our services
    const vpc = new ec2.Vpc(this, 'MovieGraphVPC', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // Create RDS instance for metadata service
    const dbSecret = new secretsmanager.Secret(this, 'DBSecret', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
      },
    });

    const metadataDb = new rds.DatabaseInstance(this, 'MetadataDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      credentials: rds.Credentials.fromSecret(dbSecret),
      databaseName: 'movie_metadata',
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Neptune cluster for graph service
    const neptuneCluster = new neptune.DatabaseCluster(this, 'GraphDB', {
      vpc,
      instanceType: neptune.InstanceType.T3_MEDIUM,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Lambda functions
    const metadataLambda = new lambda.Function(this, 'MetadataLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'dist/index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../services/metadata-api')),
      environment: {
        NODE_ENV: 'production',
        DATABASE_URL: `postgres://${dbSecret.secretValueFromJson('username')}:${dbSecret.secretValueFromJson('password')}@${metadataDb.instanceEndpoint.hostname}:${metadataDb.instanceEndpoint.port}/movie_metadata`,
      },
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
    });

    const graphLambda = new lambda.Function(this, 'GraphLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'dist/index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../services/graph-api')),
      environment: {
        NODE_ENV: 'production',
        GREMLIN_ENDPOINT: `wss://${neptuneCluster.clusterEndpoint.hostname}:${neptuneCluster.clusterEndpoint.port}/gremlin`,
      },
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
    });

    const gatewayLambda = new lambda.Function(this, 'GatewayLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'dist/index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../services/gateway-api')),
      environment: {
        NODE_ENV: 'production',
        IS_LAMBDA: 'true',
        METADATA_API_URL: `https://${props.stage}-metadata.${this.region}.amazonaws.com`,
        GRAPH_API_URL: `https://${props.stage}-graph.${this.region}.amazonaws.com`,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
    });

    // Grant necessary permissions
    metadataDb.grantConnect(metadataLambda);
    neptuneCluster.grantConnect(graphLambda);

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'MovieGraphApi', {
      restApiName: `movie-graph-api-${props.stage}`,
      description: 'Movie Graph API Gateway',
      deployOptions: {
        stageName: props.stage,
        tracingEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Add routes
    const metadataIntegration = new apigateway.LambdaIntegration(metadataLambda);
    const graphIntegration = new apigateway.LambdaIntegration(graphLambda);
    const gatewayIntegration = new apigateway.LambdaIntegration(gatewayLambda);

    const metadata = api.root.addResource('api').addResource('metadata');
    metadata.addProxy({
      defaultIntegration: metadataIntegration,
    });

    const graph = api.root.addResource('api').addResource('graph');
    graph.addProxy({
      defaultIntegration: graphIntegration,
    });

    // Add outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'NeptuneEndpoint', {
      value: neptuneCluster.clusterEndpoint.hostname,
      description: 'Neptune Cluster Endpoint',
    });

    new cdk.CfnOutput(this, 'RdsEndpoint', {
      value: metadataDb.instanceEndpoint.hostname,
      description: 'RDS Instance Endpoint',
    });
  }
} 