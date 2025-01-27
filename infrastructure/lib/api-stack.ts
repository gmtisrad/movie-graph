import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from '@aws-cdk/aws-apigatewayv2-alpha';
import * as apigatewayIntegrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as neptune from 'aws-cdk-lib/aws-neptune';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface ApiStackProps extends cdk.StackProps {
  stage: string;
}

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Create VPC with public and private subnets
    const vpc = new ec2.Vpc(this, 'MovieGraphVPC', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Look up the hosted zone for gabetimm.me
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: 'gabetimm.me',
    });

    // Generate stage-specific subdomain
    const subdomain = props.stage === 'prod' 
      ? 'movie-graph.gabetimm.me'
      : `movie-graph-${props.stage}.gabetimm.me`;

    // Create ACM certificate for the subdomain
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: subdomain,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // Create API Gateway HTTP API
    const api = new apigateway.HttpApi(this, 'MovieGraphApi', {
      corsPreflight: {
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.PUT,
          apigateway.CorsHttpMethod.DELETE,
        ],
        allowOrigins: ['*'],
        maxAge: cdk.Duration.days(1),
      },
      createDefaultStage: true,
      disableExecuteApiEndpoint: true, // Disable the default endpoint
    });

    // Configure custom domain
    const domain = new apigateway.DomainName(this, 'CustomDomain', {
      domainName: subdomain,
      certificate: certificate,
    });

    // Map the custom domain to the API
    new apigateway.ApiMapping(this, 'ApiMapping', {
      api,
      domainName: domain,
      stage: api.defaultStage!,
    });

    // Create Route 53 alias record
    new route53.ARecord(this, 'ApiAliasRecord', {
      zone: hostedZone,
      recordName: props.stage === 'prod' ? 'movie-graph' : `movie-graph-${props.stage}`,
      target: route53.RecordTarget.fromAlias(new targets.ApiGatewayv2DomainProperties(
        domain.regionalDomainName,
        domain.regionalHostedZoneId
      )),
    });

    // Create Neptune Serverless Cluster
    const neptuneCluster = new neptune.CfnDBCluster(this, 'MovieGraphDB', {
      engineVersion: '2.3.1',
      dbClusterIdentifier: `movie-graph-${props.stage}`,
      vpcSecurityGroupIds: [vpc.vpcDefaultSecurityGroup],
      serverlessScalingConfiguration: {
        minCapacity: 1.0, // Minimum NCUs
        maxCapacity: 8.0, // Maximum NCUs
      },
      iamAuthEnabled: true, // Enable IAM authentication
    });

    // Create IAM role for Neptune loader
    const loaderRole = new iam.Role(this, 'NeptuneLoaderRole', {
      assumedBy: new iam.ServicePrincipal('rds.amazonaws.com'),
      description: 'IAM role for Neptune bulk loader',
    });

    // Grant access to S3 bucket
    loaderRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:Get*',
        's3:List*',
      ],
      resources: [
        'arn:aws:s3:::movie-graph-bin',
        'arn:aws:s3:::movie-graph-bin/*',
      ],
    }));

    // Create Neptune loader function
    const loaderFunction = new lambda.Function(this, 'NeptuneLoaderFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const neptune = new AWS.Neptune();
        
        exports.handler = async (event) => {
          const params = {
            Source: 's3://movie-graph-bin',
            Format: 'csv',
            Region: '${this.region}',
            IamRoleArn: '${loaderRole.roleArn}',
            FailOnError: 'TRUE',
            Parallelism: 'MEDIUM',
          };
          
          try {
            const response = await neptune.startLoaderJob({
              ...params,
              LoaderJobId: \`load-\${Date.now()}\`,
            }).promise();
            
            console.log('Started Neptune loader job:', response);
            return response;
          } catch (error) {
            console.error('Error starting loader job:', error);
            throw error;
          }
        }
      `),
      environment: {
        NEPTUNE_ENDPOINT: neptuneCluster.attrEndpoint,
      },
      timeout: cdk.Duration.minutes(5),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    // Grant loader function permissions to start loader jobs
    loaderFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'neptune-db:*',
        'neptune:StartLoaderJob',
        'neptune:GetLoaderJobStatus',
      ],
      resources: [
        `arn:aws:neptune-db:${this.region}:${this.account}:${neptuneCluster.ref}/*`,
        `arn:aws:neptune:${this.region}:${this.account}:*`,
      ],
    }));

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `https://${subdomain}`,
      description: 'API Gateway endpoint URL',
    });

    // Add Neptune endpoint to outputs
    new cdk.CfnOutput(this, 'NeptuneEndpoint', {
      value: neptuneCluster.attrEndpoint,
      description: 'Neptune Serverless cluster endpoint',
    });
  }
} 