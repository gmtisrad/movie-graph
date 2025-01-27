import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface NetworkStackProps extends cdk.StackProps {
  stage: string;
}

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    // Create VPC flow logs
    const flowLogRole = new iam.Role(this, 'VPCFlowLogRole', {
      assumedBy: new iam.ServicePrincipal('vpc-flow-logs.amazonaws.com'),
    });

    const flowLogGroup = new logs.LogGroup(this, 'VPCFlowLogGroup', {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create VPC with public and private subnets
    this.vpc = new ec2.Vpc(this, 'MovieGraphVPC', {
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
      flowLogs: {
        'flowlog': {
          destination: ec2.FlowLogDestination.toCloudWatchLogs(flowLogGroup, flowLogRole),
          trafficType: ec2.FlowLogTrafficType.ALL,
        },
      },
    });

    // Add tags
    cdk.Tags.of(this.vpc).add('Project', 'MovieGraph');
    cdk.Tags.of(this.vpc).add('Environment', props.stage);
    cdk.Tags.of(this.vpc).add('ManagedBy', 'CDK');

    // Create VPC Endpoints for serverless architecture
    new ec2.InterfaceVpcEndpoint(this, 'NeptuneEndpoint', {
      vpc: this.vpc,
      service: {
        name: 'neptune-db',
        port: 8182
      },
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      }
    });

    // Add CloudWatch endpoint for logging
    this.vpc.addInterfaceEndpoint('CloudWatchEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS
    });

    this.vpc.addInterfaceEndpoint('SecretsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    });

    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    // Add outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
    });

    new cdk.CfnOutput(this, 'PublicSubnets', {
      value: JSON.stringify(this.vpc.publicSubnets.map(s => s.subnetId)),
      description: 'Public subnet IDs',
    });

    new cdk.CfnOutput(this, 'PrivateSubnets', {
      value: JSON.stringify(this.vpc.privateSubnets.map(s => s.subnetId)),
      description: 'Private subnet IDs',
    });

    new cdk.CfnOutput(this, 'IsolatedSubnets', {
      value: JSON.stringify(this.vpc.isolatedSubnets.map(s => s.subnetId)),
      description: 'Isolated subnet IDs',
    });

    new cdk.CfnOutput(this, 'FlowLogGroup', {
      value: flowLogGroup.logGroupName,
      description: 'VPC Flow Log Group Name',
    });
  }
} 