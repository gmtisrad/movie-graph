"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const rds = __importStar(require("aws-cdk-lib/aws-rds"));
const neptune = __importStar(require("aws-cdk-lib/aws-neptune"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
class DatabaseStack extends cdk.Stack {
    constructor(scope, id, props) {
        var _a;
        super(scope, id, props);
        // Create Neptune security group
        const neptuneSecurityGroup = new ec2.SecurityGroup(this, 'NeptuneSecurityGroup', {
            vpc: props.vpc,
            description: 'Security group for Neptune cluster',
            allowAllOutbound: true,
        });
        neptuneSecurityGroup.addIngressRule(ec2.Peer.ipv4(props.vpc.vpcCidrBlock), ec2.Port.tcp(8182), 'Allow Gremlin access from VPC');
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
        dbSecurityGroup.addIngressRule(ec2.Peer.ipv4(props.vpc.vpcCidrBlock), ec2.Port.tcp(5432), 'Allow PostgreSQL access from VPC');
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
        // Create IAM role for Neptune loader
        const loaderRole = new iam.Role(this, 'NeptuneLoaderRole', {
            assumedBy: new iam.ServicePrincipal('rds.amazonaws.com'),
            description: 'IAM role for Neptune bulk loader',
        });
        // Grant access to S3 bucket
        loaderRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:Get*',
                's3:List*',
            ],
            resources: [
                'arn:aws:s3:::movie-graph-bin',
                'arn:aws:s3:::movie-graph-bin/*',
            ],
        }));
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
            value: ((_a = this.rdsInstance.secret) === null || _a === void 0 ? void 0 : _a.secretArn) || '',
            description: 'Database credentials secret ARN',
        });
    }
}
exports.DatabaseStack = DatabaseStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWJhc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvc3RhY2tzL2RhdGFiYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLGlFQUFtRDtBQUNuRCx5REFBMkM7QUFRM0MsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFJMUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF5Qjs7UUFDakUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsZ0NBQWdDO1FBQ2hDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUMvRSxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUc7WUFDZCxXQUFXLEVBQUUsb0NBQW9DO1lBQ2pELGdCQUFnQixFQUFFLElBQUk7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsb0JBQW9CLENBQUMsY0FBYyxDQUNqQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUNyQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFDbEIsK0JBQStCLENBQ2hDLENBQUM7UUFFRixvQ0FBb0M7UUFDcEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUNuRSxhQUFhLEVBQUUsU0FBUztZQUN4QixtQkFBbUIsRUFBRSxlQUFlLEtBQUssQ0FBQyxLQUFLLEVBQUU7WUFDakQsbUJBQW1CLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlLENBQUM7WUFDM0QsaUJBQWlCLEVBQUUsSUFBSSxPQUFPLENB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QkFDUCxTQUFTO2dCQUNULFVBQVU7YUFDWDtZQUNELFNBQVMsRUFBRTtnQkFDVCw4QkFBOEI7Z0JBQzlCLGdDQUFnQzthQUNqQztTQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUosY0FBYztRQUNkLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDekMsS0FBSyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWTtZQUN2QyxXQUFXLEVBQUUscUNBQXFDO1NBQ25ELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3JDLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVE7WUFDakQsV0FBVyxFQUFFLHVCQUF1QjtTQUNyQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNyQyxLQUFLLEVBQUUsQ0FBQSxNQUFBLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSwwQ0FBRSxTQUFTLEtBQUksRUFBRTtZQUMvQyxXQUFXLEVBQUUsaUNBQWlDO1NBQy9DLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTFHRCxzQ0EwR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgcmRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yZHMnO1xuaW1wb3J0ICogYXMgbmVwdHVuZSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbmVwdHVuZSc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuaW50ZXJmYWNlIERhdGFiYXNlU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgc3RhZ2U6IHN0cmluZztcbiAgdnBjOiBlYzIuSVZwYztcbn1cblxuZXhwb3J0IGNsYXNzIERhdGFiYXNlU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgbmVwdHVuZUNsdXN0ZXI6IG5lcHR1bmUuQ2ZuREJDbHVzdGVyO1xuICBwdWJsaWMgcmVhZG9ubHkgcmRzSW5zdGFuY2U6IHJkcy5EYXRhYmFzZUluc3RhbmNlO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBEYXRhYmFzZVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIENyZWF0ZSBOZXB0dW5lIHNlY3VyaXR5IGdyb3VwXG4gICAgY29uc3QgbmVwdHVuZVNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ05lcHR1bmVTZWN1cml0eUdyb3VwJywge1xuICAgICAgdnBjOiBwcm9wcy52cGMsXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBOZXB0dW5lIGNsdXN0ZXInLFxuICAgICAgYWxsb3dBbGxPdXRib3VuZDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIG5lcHR1bmVTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgZWMyLlBlZXIuaXB2NChwcm9wcy52cGMudnBjQ2lkckJsb2NrKSxcbiAgICAgIGVjMi5Qb3J0LnRjcCg4MTgyKSxcbiAgICAgICdBbGxvdyBHcmVtbGluIGFjY2VzcyBmcm9tIFZQQydcbiAgICApO1xuXG4gICAgLy8gQ3JlYXRlIE5lcHR1bmUgU2VydmVybGVzcyBDbHVzdGVyXG4gICAgdGhpcy5uZXB0dW5lQ2x1c3RlciA9IG5ldyBuZXB0dW5lLkNmbkRCQ2x1c3Rlcih0aGlzLCAnTW92aWVHcmFwaERCJywge1xuICAgICAgZW5naW5lVmVyc2lvbjogJzEuMi4wLjInLFxuICAgICAgZGJDbHVzdGVySWRlbnRpZmllcjogYG1vdmllLWdyYXBoLSR7cHJvcHMuc3RhZ2V9YCxcbiAgICAgIHZwY1NlY3VyaXR5R3JvdXBJZHM6IFtuZXB0dW5lU2VjdXJpdHlHcm91cC5zZWN1cml0eUdyb3VwSWRdLFxuICAgICAgZGJTdWJuZXRHcm91cE5hbWU6IG5ldyBuZXB0dW5lLkNmbkRCU3VibmV0R3JvdXAodGhpcywgJ05lcHR1bmVTdWJuZXRHcm91cCcsIHtcbiAgICAgICAgZGJTdWJuZXRHcm91cE5hbWU6IGBtb3ZpZS1ncmFwaC0ke3Byb3BzLnN0YWdlfS1uZXB0dW5lYCxcbiAgICAgICAgZGJTdWJuZXRHcm91cERlc2NyaXB0aW9uOiAnU3VibmV0IGdyb3VwIGZvciBOZXB0dW5lIGNsdXN0ZXInLFxuICAgICAgICBzdWJuZXRJZHM6IHByb3BzLnZwYy5zZWxlY3RTdWJuZXRzKHtcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVEXG4gICAgICAgIH0pLnN1Ym5ldElkcyxcbiAgICAgIH0pLnJlZixcbiAgICAgIHNlcnZlcmxlc3NTY2FsaW5nQ29uZmlndXJhdGlvbjoge1xuICAgICAgICBtaW5DYXBhY2l0eTogMS4wLFxuICAgICAgICBtYXhDYXBhY2l0eTogOC4wLFxuICAgICAgfSxcbiAgICAgIGlhbUF1dGhFbmFibGVkOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIFJEUyBJbnN0YW5jZSBmb3IgbWV0YWRhdGFcbiAgICBjb25zdCBkYlNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0RhdGFiYXNlU2VjdXJpdHlHcm91cCcsIHtcbiAgICAgIHZwYzogcHJvcHMudnBjLFxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgUkRTIGluc3RhbmNlJyxcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICBkYlNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXG4gICAgICBlYzIuUGVlci5pcHY0KHByb3BzLnZwYy52cGNDaWRyQmxvY2spLFxuICAgICAgZWMyLlBvcnQudGNwKDU0MzIpLFxuICAgICAgJ0FsbG93IFBvc3RncmVTUUwgYWNjZXNzIGZyb20gVlBDJ1xuICAgICk7XG5cbiAgICB0aGlzLnJkc0luc3RhbmNlID0gbmV3IHJkcy5EYXRhYmFzZUluc3RhbmNlKHRoaXMsICdNZXRhZGF0YURCJywge1xuICAgICAgZW5naW5lOiByZHMuRGF0YWJhc2VJbnN0YW5jZUVuZ2luZS5wb3N0Z3Jlcyh7XG4gICAgICAgIHZlcnNpb246IHJkcy5Qb3N0Z3Jlc0VuZ2luZVZlcnNpb24uVkVSXzE1LFxuICAgICAgfSksXG4gICAgICBpbnN0YW5jZVR5cGU6IGVjMi5JbnN0YW5jZVR5cGUub2YoZWMyLkluc3RhbmNlQ2xhc3MuVDRHLCBlYzIuSW5zdGFuY2VTaXplLk1JQ1JPKSxcbiAgICAgIHZwYzogcHJvcHMudnBjLFxuICAgICAgdnBjU3VibmV0czoge1xuICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVELFxuICAgICAgfSxcbiAgICAgIHNlY3VyaXR5R3JvdXBzOiBbZGJTZWN1cml0eUdyb3VwXSxcbiAgICAgIGRhdGFiYXNlTmFtZTogJ21vdmllbWV0YWRhdGEnLFxuICAgICAgY3JlZGVudGlhbHM6IHJkcy5DcmVkZW50aWFscy5mcm9tR2VuZXJhdGVkU2VjcmV0KCdwb3N0Z3JlcycsIHtcbiAgICAgICAgc2VjcmV0TmFtZTogYC8ke3Byb3BzLnN0YWdlfS9tb3ZpZS1ncmFwaC9kYi9jcmVkZW50aWFsc2AsXG4gICAgICB9KSxcbiAgICAgIGJhY2t1cFJldGVudGlvbjogY2RrLkR1cmF0aW9uLmRheXMocHJvcHMuc3RhZ2UgPT09ICdwcm9kJyA/IDcgOiAxKSxcbiAgICAgIGRlbGV0ZUF1dG9tYXRlZEJhY2t1cHM6IHByb3BzLnN0YWdlICE9PSAncHJvZCcsXG4gICAgICByZW1vdmFsUG9saWN5OiBwcm9wcy5zdGFnZSA9PT0gJ3Byb2QnID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBJQU0gcm9sZSBmb3IgTmVwdHVuZSBsb2FkZXJcbiAgICBjb25zdCBsb2FkZXJSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdOZXB0dW5lTG9hZGVyUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdyZHMuYW1hem9uYXdzLmNvbScpLFxuICAgICAgZGVzY3JpcHRpb246ICdJQU0gcm9sZSBmb3IgTmVwdHVuZSBidWxrIGxvYWRlcicsXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBhY2Nlc3MgdG8gUzMgYnVja2V0XG4gICAgbG9hZGVyUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdzMzpHZXQqJyxcbiAgICAgICAgJ3MzOkxpc3QqJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgJ2Fybjphd3M6czM6Ojptb3ZpZS1ncmFwaC1iaW4nLFxuICAgICAgICAnYXJuOmF3czpzMzo6Om1vdmllLWdyYXBoLWJpbi8qJyxcbiAgICAgIF0sXG4gICAgfSkpO1xuXG4gICAgLy8gQWRkIG91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTmVwdHVuZUVuZHBvaW50Jywge1xuICAgICAgdmFsdWU6IHRoaXMubmVwdHVuZUNsdXN0ZXIuYXR0ckVuZHBvaW50LFxuICAgICAgZGVzY3JpcHRpb246ICdOZXB0dW5lIFNlcnZlcmxlc3MgY2x1c3RlciBlbmRwb2ludCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUmRzRW5kcG9pbnQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5yZHNJbnN0YW5jZS5pbnN0YW5jZUVuZHBvaW50Lmhvc3RuYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdSRFMgaW5zdGFuY2UgZW5kcG9pbnQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RiU2VjcmV0QXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMucmRzSW5zdGFuY2Uuc2VjcmV0Py5zZWNyZXRBcm4gfHwgJycsXG4gICAgICBkZXNjcmlwdGlvbjogJ0RhdGFiYXNlIGNyZWRlbnRpYWxzIHNlY3JldCBBUk4nLFxuICAgIH0pO1xuICB9XG59ICJdfQ==