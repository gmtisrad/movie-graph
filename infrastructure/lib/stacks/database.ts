import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as neptune from 'aws-cdk-lib/aws-neptune';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import path from 'path';

interface DatabaseStackProps extends cdk.StackProps {
  stage: string;
  vpc: ec2.IVpc;
}

export class DatabaseStack extends cdk.Stack {
  public readonly neptuneCluster: neptune.CfnDBCluster;
  public readonly rdsInstance: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Create Neptune security group
    const neptuneSecurityGroup = new ec2.SecurityGroup(this, 'NeptuneSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for Neptune cluster',
      allowAllOutbound: true,
    });

    // Create security group for EC2 instance
    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'NeptuneManagerSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for Neptune manager EC2 instance',
      allowAllOutbound: true,
    });

    // Create security group for EIC endpoint
    const eicSecurityGroup = new ec2.SecurityGroup(this, 'EICSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for EC2 Instance Connect Endpoint',
      allowAllOutbound: true,
    });

    // Configure security group rules
    ec2SecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(eicSecurityGroup.securityGroupId),
      ec2.Port.tcp(22),
      'Allow SSH access from EC2 Instance Connect Endpoint'
    );

    neptuneSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(ec2SecurityGroup.securityGroupId),
      ec2.Port.tcp(8182),
      'Allow Neptune access from EC2 instance'
    );

    // Import the existing S3 bucket
    const dataBucket = s3.Bucket.fromBucketName(this, 'DataBucket', 'movie-graph-bin');

    // Create Neptune Serverless Cluster
    this.neptuneCluster = new neptune.CfnDBCluster(this, 'MovieGraphDB', {
      engineVersion: '1.2.0.2',
      dbClusterIdentifier: `movie-graph-${props.stage}`,
      vpcSecurityGroupIds: [neptuneSecurityGroup.securityGroupId],
      dbSubnetGroupName: new neptune.CfnDBSubnetGroup(this, 'NeptuneSubnetGroup', {
        dbSubnetGroupName: `movie-graph-${props.stage}-neptune`,
        dbSubnetGroupDescription: 'Subnet group for Neptune cluster',
        subnetIds: props.vpc.selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED
        }).subnetIds,
      }).ref,
      serverlessScalingConfiguration: {
        minCapacity: 1.0,
        maxCapacity: 8.0,
      },
      iamAuthEnabled: true,
    });

    // Create RDS Instance for metadata
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for RDS instance',
      allowAllOutbound: true,
    });

    dbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from VPC'
    );

    this.rdsInstance = new rds.DatabaseInstance(this, 'MetadataDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      databaseName: 'moviemetadata',
      credentials: rds.Credentials.fromGeneratedSecret('postgres', {
        secretName: `/${props.stage}/movie-graph/db/credentials`,
      }),
      backupRetention: cdk.Duration.days(props.stage === 'prod' ? 7 : 1),
      deleteAutomatedBackups: props.stage !== 'prod',
      removalPolicy: props.stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    // Add outputs
    new cdk.CfnOutput(this, 'NeptuneEndpoint', {
      value: this.neptuneCluster.attrEndpoint,
      description: 'Neptune Serverless cluster endpoint',
    });

    new cdk.CfnOutput(this, 'RdsEndpoint', {
      value: this.rdsInstance.instanceEndpoint.hostname,
      description: 'RDS instance endpoint',
    });

    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: this.rdsInstance.secret?.secretArn || '',
      description: 'Database credentials secret ARN',
    });

    // Create EC2 Instance Connect Endpoint
    const eicEndpoint = new ec2.CfnInstanceConnectEndpoint(this, 'NeptuneManagerEICEndpoint', {
      subnetId: props.vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      }).subnetIds[0],
      preserveClientIp: true,
      securityGroupIds: [eicSecurityGroup.securityGroupId],
    });

    // Create IAM role for Neptune manager instance
    const managerRole = new iam.Role(this, 'NeptuneManagerRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'Role for Neptune manager EC2 instance',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('NeptuneFullAccess'),
      ],
    });

    // Grant access to S3 bucket
    dataBucket.grantRead(managerRole);

    // Create Neptune manager instance
    const managerInstance = new ec2.Instance(this, 'NeptuneManager', {
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64
      }),
      role: managerRole,
      securityGroup: ec2SecurityGroup,
      userData: ec2.UserData.forLinux(),
    });

    managerInstance.addUserData(
      'yum update -y',
      'yum install -y amazon-neptune-tools python3-pip git',
      'pip3 install neptune-python-utils',
      'pip3 install awscli',
    );

    // Add outputs
    new cdk.CfnOutput(this, 'ManagerInstanceId', {
      value: managerInstance.instanceId,
      description: 'Neptune manager instance ID',
    });

    new cdk.CfnOutput(this, 'EICEndpointId', {
      value: eicEndpoint.attrId,
      description: 'EC2 Instance Connect Endpoint ID',
    });
  }
} 