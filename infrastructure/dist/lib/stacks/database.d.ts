import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as neptune from 'aws-cdk-lib/aws-neptune';
import { Construct } from 'constructs';
interface DatabaseStackProps extends cdk.StackProps {
    stage: string;
    vpc: ec2.IVpc;
}
export declare class DatabaseStack extends cdk.Stack {
    readonly neptuneCluster: neptune.CfnDBCluster;
    readonly rdsInstance: rds.DatabaseInstance;
    constructor(scope: Construct, id: string, props: DatabaseStackProps);
}
export {};
