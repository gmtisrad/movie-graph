import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as neptune from 'aws-cdk-lib/aws-neptune';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';
interface ComputeStackProps extends cdk.StackProps {
    stage: string;
    vpc: ec2.IVpc;
    neptuneCluster: neptune.CfnDBCluster;
    rdsInstance: rds.DatabaseInstance;
}
export declare class ComputeStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ComputeStackProps);
}
export {};
