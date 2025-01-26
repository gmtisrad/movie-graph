import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from '@aws-cdk/aws-apigatewayv2-alpha';
import * as apigatewayIntegrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
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

    // Create ACM certificate for the subdomain
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: 'movie-graph.gabetimm.me',
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
      domainName: 'movie-graph.gabetimm.me',
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
      recordName: 'movie-graph',
      target: route53.RecordTarget.fromAlias(new targets.ApiGatewayv2DomainProperties(
        domain.regionalDomainName,
        domain.regionalHostedZoneId
      )),
    });

    // ... rest of your stack (RDS, Neptune, Lambda functions, etc.)

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `https://movie-graph.gabetimm.me`,
      description: 'API Gateway endpoint URL',
    });
  }
} 