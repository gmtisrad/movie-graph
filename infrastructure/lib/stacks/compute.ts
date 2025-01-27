import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as neptune from 'aws-cdk-lib/aws-neptune';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

interface ComputeStackProps extends cdk.StackProps {
  stage: string;
  vpc: ec2.IVpc;
  neptuneCluster: neptune.CfnDBCluster;
  rdsInstance: rds.DatabaseInstance;
}

export class ComputeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

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
            IamRoleArn: '${props.neptuneCluster.attrEndpoint}',
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
        NEPTUNE_ENDPOINT: props.neptuneCluster.attrEndpoint,
        RDS_SECRET_ARN: props.rdsInstance.secret?.secretArn || '',
        RDS_ENDPOINT: props.rdsInstance.instanceEndpoint.hostname,
      },
      timeout: cdk.Duration.minutes(5),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    // Create API Gateway REST API
    const api = new apigw.RestApi(this, 'MovieGraphApi', {
      restApiName: `movie-graph-${props.stage}`,
      description: 'Movie Graph API',
      defaultCorsPreflightOptions: {
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowOrigins: ['*'],
        maxAge: cdk.Duration.days(1),
      },
      domainName: {
        domainName: subdomain,
        certificate: certificate,
      },
      endpointTypes: [apigw.EndpointType.REGIONAL],
      deployOptions: {
        stageName: props.stage,
        tracingEnabled: true,
      },
    });

    // Create Route 53 alias record
    new route53.ARecord(this, 'ApiAliasRecord', {
      zone: hostedZone,
      recordName: props.stage === 'prod' ? 'movie-graph' : `movie-graph-${props.stage}`,
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGateway(api)
      ),
    });

    // Add outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `https://${subdomain}`,
      description: 'API Gateway endpoint URL',
    });
  }
} 