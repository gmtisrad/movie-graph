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