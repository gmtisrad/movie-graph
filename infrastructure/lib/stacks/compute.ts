import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as apigateway from '@aws-cdk/aws-apigatewayv2-alpha';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as neptune from 'aws-cdk-lib/aws-neptune';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as logs from 'aws-cdk-lib/aws-logs';
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

    // Create log group for API Gateway
    const logGroup = new logs.LogGroup(this, 'ApiGatewayLogs', {
      logGroupName: `/aws/apigateway/movie-graph-${props.stage}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create API Gateway HTTP API
    const api = new apigateway.HttpApi(this, 'MovieGraphApi', {
      apiName: `movie-graph-${props.stage}`,
      description: 'Movie Graph API',
      corsPreflight: {
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Date',
          'X-Amz-Security-Token',
        ],
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.PUT,
          apigateway.CorsHttpMethod.DELETE,
          apigateway.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ['*'],
        maxAge: cdk.Duration.days(1),
        exposeHeaders: ['*'],
      },
      createDefaultStage: true,
      disableExecuteApiEndpoint: true,
    });

    // Configure stage with logging
    const stage = api.defaultStage!;
    const cfnStage = stage.node.defaultChild as apigwv2.CfnStage;
    cfnStage.accessLogSettings = {
      destinationArn: logGroup.logGroupArn,
      format: JSON.stringify({
        requestId: '$context.requestId',
        ip: '$context.identity.sourceIp',
        requestTime: '$context.requestTime',
        httpMethod: '$context.httpMethod',
        routeKey: '$context.routeKey',
        status: '$context.status',
        protocol: '$context.protocol',
        responseLength: '$context.responseLength',
        integrationError: '$context.integrationErrorMessage',
      }),
    };

    // Add detailed metrics
    cfnStage.defaultRouteSettings = {
      throttlingBurstLimit: 100,
      throttlingRateLimit: 50,
      detailedMetricsEnabled: true,
    };

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

    // Add tags
    cdk.Tags.of(this).add('Project', 'MovieGraph');
    cdk.Tags.of(this).add('Environment', props.stage);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    // Add outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `https://${subdomain}`,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: api.apiId,
      description: 'API Gateway ID',
    });

    new cdk.CfnOutput(this, 'LogGroupName', {
      value: logGroup.logGroupName,
      description: 'API Gateway Log Group Name',
    });
  }
} 