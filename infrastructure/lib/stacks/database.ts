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

    // Import the existing S3 bucket
    const dataBucket = s3.Bucket.fromBucketName(this, 'DataBucket', 'movie-graph-bin');

    // Create IAM role for Neptune
    const neptuneRole = new iam.Role(this, 'NeptuneS3Role', {
      assumedBy: new iam.ServicePrincipal('rds.amazonaws.com'),
      description: 'IAM role for Neptune S3 access',
    });

    // Grant S3 access to Neptune for the existing bucket
    // Note: movie-graph-bin bucket must exist and be accessible
    neptuneRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:ListBucket'
      ],
      resources: [
        dataBucket.bucketArn,
        `${dataBucket.bucketArn}/*`
      ]
    }));

    neptuneSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(8182),
      'Allow Gremlin access from VPC'
    );

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
      associatedRoles: [{
        roleArn: neptuneRole.roleArn
      }]
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

    // Create Lambda function for Neptune loader
    const loaderFunction = new nodejs.NodejsFunction(this, 'NeptuneLoaderProxy', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../../lambda/loader/index.ts'),
      depsLockFilePath: path.join(__dirname, '../../lambda/loader/package-lock.json'),
      bundling: {
        externalModules: ['@aws-sdk/*'],
      },
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      securityGroups: [neptuneSecurityGroup],
      environment: {
        NEPTUNE_ENDPOINT: this.neptuneCluster.attrEndpoint
      },
      timeout: cdk.Duration.seconds(30)
    });

    // Grant Neptune access to the Lambda function
    loaderFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['neptune-db:*'],
      resources: [`arn:aws:neptune-db:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:${this.neptuneCluster.ref}/*`],
      effect: iam.Effect.ALLOW
    }));

    // Add Lambda URL for easy access
    const functionUrl = loaderFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM
    });

    new cdk.CfnOutput(this, 'LoaderEndpoint', {
      value: functionUrl.url,
      description: 'Neptune loader proxy endpoint'
    });
  }
} 