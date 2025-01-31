import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as neptune from 'aws-cdk-lib/aws-neptune';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  stage: string;
  vpc: ec2.IVpc;
}

export class DatabaseStack extends cdk.Stack {
  public readonly neptuneCluster: neptune.CfnDBCluster;
  public readonly neptuneInstance: neptune.CfnDBInstance;
  public readonly rdsInstance: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Create security groups
    const neptuneSecurityGroup = new ec2.SecurityGroup(this, 'NeptuneSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for Neptune cluster',
      allowAllOutbound: true,
    });

    const managerSecurityGroup = new ec2.SecurityGroup(this, 'NeptuneManagerSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for Neptune manager EC2 instance',
      allowAllOutbound: true,
    });

    const eicSecurityGroup = new ec2.SecurityGroup(this, 'EICSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for EC2 Instance Connect Endpoint',
      allowAllOutbound: true,
    });

    const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for RDS instance',
      allowAllOutbound: true,
    });

    // Configure security group rules
    neptuneSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(managerSecurityGroup.securityGroupId),
      ec2.Port.tcp(8182),
      'Allow Neptune access from manager instance'
    );

    rdsSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(managerSecurityGroup.securityGroupId),
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from manager instance'
    );

    // Allow SSH access only from EC2 Instance Connect Endpoint
    managerSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(eicSecurityGroup.securityGroupId),
      ec2.Port.tcp(22),
      'Allow SSH access from EC2 Instance Connect Endpoint only'
    );

    // Import the existing S3 bucket
    const dataBucket = s3.Bucket.fromBucketName(this, 'DataBucket', 'movie-graph-bin');

    // Add bucket policy for Neptune access
    const bucketPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('neptune-db.amazonaws.com')],
      actions: [
        's3:Get*',
        's3:List*'
      ],
      resources: [
        dataBucket.bucketArn,
        `${dataBucket.bucketArn}/*`
      ],
      conditions: {
        StringEquals: {
          'aws:SourceAccount': cdk.Stack.of(this).account
        },
        ArnLike: {
          'aws:SourceArn': `arn:aws:neptune-db:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:*/*`
        }
      }
    });

    // Apply the policy to the bucket
    dataBucket.addToResourcePolicy(bucketPolicy);

    // Create IAM roles
    const neptuneRole = new iam.Role(this, 'NeptuneS3Role', {
      assumedBy: new iam.ServicePrincipal('rds.amazonaws.com'),
      description: 'IAM role for Neptune S3 access',
    });

    const managerRole = new iam.Role(this, 'NeptuneManagerRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'Role for Neptune manager EC2 instance',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('EC2InstanceConnect'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'),
      ],
    });

    // Add S3 access policies for Neptune bulk loading
    neptuneRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:Get*',
        's3:List*'
      ],
      resources: [
        dataBucket.bucketArn,
        `${dataBucket.bucketArn}/*`
      ],
    }));

    // Add CloudWatch Logs permissions for Neptune
    neptuneRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: [`arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/aws/neptune/*`],
    }));

    // Create Neptune subnet group
    const neptuneSubnetGroup = new neptune.CfnDBSubnetGroup(this, 'NeptuneSubnetGroup', {
      dbSubnetGroupName: `movie-graph-${props.stage}-neptune`,
      dbSubnetGroupDescription: 'Subnet group for Neptune cluster',
      subnetIds: props.vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      }).subnetIds,
    });

    // Create Neptune Serverless Cluster with enhanced security
    this.neptuneCluster = new neptune.CfnDBCluster(this, 'MovieGraphDB', {
      engineVersion: '1.2.0.2',
      dbClusterIdentifier: `movie-graph-${props.stage}`,
      vpcSecurityGroupIds: [neptuneSecurityGroup.securityGroupId],
      dbSubnetGroupName: neptuneSubnetGroup.ref,
      serverlessScalingConfiguration: {
        minCapacity: 1.0,
        maxCapacity: 8.0,
      },
      iamAuthEnabled: true,
      dbPort: 8182,
      storageEncrypted: true,
      enableCloudwatchLogsExports: ['audit'],
      availabilityZones: props.vpc.availabilityZones.slice(0, 2),
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      deletionProtection: false,
      associatedRoles: [{
        roleArn: neptuneRole.roleArn
      }],
    });

    // Add permissions for Neptune access and IAM authentication
    managerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'neptune-db:*',
        'iam:GetRole',
        'iam:GetRolePolicy',
        'iam:ListRoles',
        'iam:ListRolePolicies',
        'iam:GetUser',
        'iam:ListUsers',
      ],
      resources: ['*'],
    }));

    // Add temporary credentials management
    managerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'sts:AssumeRole',
        'sts:GetSessionToken',
      ],
      resources: ['*'],
    }));

    // Add CloudWatch monitoring for bulk loading
    managerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData',
        'cloudwatch:GetMetricStatistics',
      ],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'cloudwatch:namespace': 'AWS/Neptune',
        },
      },
    }));

    // Create Neptune instance
    this.neptuneInstance = new neptune.CfnDBInstance(this, 'NeptuneInstance', {
      dbInstanceClass: 'db.serverless',
      dbClusterIdentifier: this.neptuneCluster.ref,
      availabilityZone: props.vpc.availabilityZones[0],
    });

    // Add dependency to ensure cluster is created first
    this.neptuneInstance.addDependency(this.neptuneCluster);

    // Create RDS instance
    this.rdsInstance = new rds.DatabaseInstance(this, 'MetadataDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [rdsSecurityGroup],
      databaseName: 'moviemetadata',
      credentials: rds.Credentials.fromGeneratedSecret('postgres', {
        secretName: `/${props.stage}/movie-graph/db/credentials`,
      }),
      backupRetention: cdk.Duration.days(1),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    // Create Neptune manager instance in private subnet
    const managerInstance = new ec2.Instance(this, 'NeptuneManager', {
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64
      }),
      role: managerRole,
      securityGroup: managerSecurityGroup,
      userData: ec2.UserData.forLinux(),
    });

    // Create EC2 Instance Connect Endpoint
    const eicEndpoint = new ec2.CfnInstanceConnectEndpoint(this, 'NeptuneManagerEICEndpoint', {
      subnetId: props.vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      }).subnetIds[0],
      preserveClientIp: true,
      securityGroupIds: [eicSecurityGroup.securityGroupId],
    });

    // Add user data script for Neptune tools installation
    managerInstance.addUserData(
      'dnf update -y',
      'dnf install -y git python3-pip curl jq',
      'cd /home/ec2-user',
      'git clone https://github.com/awslabs/amazon-neptune-tools.git',
      'cd amazon-neptune-tools/neptune-python-utils',
      'pip3 install .',
      'cd /home/ec2-user',
      'git clone https://github.com/awslabs/amazon-neptune-gremlin-client.git',
      'pip3 install awscli requests requests-aws4auth boto3',
      // Add Neptune signing utilities
      'curl -O https://raw.githubusercontent.com/aws-samples/amazon-neptune-samples/master/neptune-sagemaker/notebooks/util/neptune_python_utils.py',
      'curl -O https://raw.githubusercontent.com/aws-samples/amazon-neptune-samples/master/neptune-sagemaker/notebooks/util/neptune_util.sh',
      'chmod +x neptune_util.sh',
      'chown -R ec2-user:ec2-user /home/ec2-user',
    );

    // Add outputs
    new cdk.CfnOutput(this, 'NeptuneEndpoint', {
      value: this.neptuneCluster.attrEndpoint,
      description: 'Neptune Serverless cluster endpoint',
    });

    new cdk.CfnOutput(this, 'NeptuneInstanceEndpoint', {
      value: this.neptuneInstance.attrEndpoint,
      description: 'Neptune Serverless instance endpoint (reader)',
    });

    new cdk.CfnOutput(this, 'RdsEndpoint', {
      value: this.rdsInstance.instanceEndpoint.hostname,
      description: 'RDS instance endpoint',
    });

    new cdk.CfnOutput(this, 'ManagerInstanceId', {
      value: managerInstance.instanceId,
      description: 'Neptune manager instance ID',
    });

    new cdk.CfnOutput(this, 'EICEndpointId', {
      value: eicEndpoint.ref,
      description: 'EC2 Instance Connect Endpoint ID',
    });

    new cdk.CfnOutput(this, 'NeptuneClusterId', {
      value: this.neptuneCluster.ref,
      description: 'Neptune Cluster ID',
    });
  }
} 