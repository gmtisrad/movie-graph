import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
interface ApiStackProps extends cdk.StackProps {
    stage: string;
}
export declare class ApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ApiStackProps);
}
export {};
