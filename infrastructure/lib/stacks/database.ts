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

    const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for RDS instance',
      allowAllOutbound: true,
    });

    // Allow Neptune to access S3 VPC endpoint
    neptuneSecurityGroup.addEgressRule(
      ec2.Peer.ipv4('0.0.0.0/0'),
      ec2.Port.tcp(443),
      'Allow HTTPS egress for S3 access'
    );
    // Import the existing S3 bucket
    const dataBucket = s3.Bucket.fromBucketName(this, 'DataBucket', 'movie-graph-bin');

    // Add bucket policy for Neptune access
    const bucketPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('rds.amazonaws.com')],
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
          'aws:SourceArn': `arn:aws:rds:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:*/*`
        }
      }
    });

    // Apply the policy to the bucket
    dataBucket.addToResourcePolicy(bucketPolicy);

    // Create IAM roles
    const neptuneRole = new iam.Role(this, 'NeptuneS3Role', {
      assumedBy: new iam.ServicePrincipal('rds.amazonaws.com'),
      description: 'IAM role for Neptune S3 access',
      roleName: `${this.stackName}-${props.stage}-NeptuneS3Role`
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
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      }).subnetIds,
    });

    // Create Neptune Serverless Cluster with enhanced security
    this.neptuneCluster = new neptune.CfnDBCluster(this, 'MovieGraphDB', {
      engineVersion: '1.3.2.1',
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
      }]
    });


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
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
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

    new cdk.CfnOutput(this, 'NeptuneClusterId', {
      value: this.neptuneCluster.ref,
      description: 'Neptune Cluster ID',
    });
  }
} 