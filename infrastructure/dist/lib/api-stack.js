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
exports.ApiStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigateway = __importStar(require("@aws-cdk/aws-apigatewayv2-alpha"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const neptune = __importStar(require("aws-cdk-lib/aws-neptune"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
class ApiStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create VPC with public and private subnets
        const vpc = new ec2.Vpc(this, 'MovieGraphVPC', {
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
        });
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
        // Create API Gateway HTTP API
        const api = new apigateway.HttpApi(this, 'MovieGraphApi', {
            corsPreflight: {
                allowHeaders: ['Content-Type', 'Authorization'],
                allowMethods: [
                    apigateway.CorsHttpMethod.GET,
                    apigateway.CorsHttpMethod.POST,
                    apigateway.CorsHttpMethod.PUT,
                    apigateway.CorsHttpMethod.DELETE,
                ],
                allowOrigins: ['*'],
                maxAge: cdk.Duration.days(1),
            },
            createDefaultStage: true,
            disableExecuteApiEndpoint: true, // Disable the default endpoint
        });
        // Configure custom domain
        const domain = new apigateway.DomainName(this, 'CustomDomain', {
            domainName: subdomain,
            certificate: certificate,
        });
        // Map the custom domain to the API
        new apigateway.ApiMapping(this, 'ApiMapping', {
            api,
            domainName: domain,
            stage: api.defaultStage,
        });
        // Create Route 53 alias record
        new route53.ARecord(this, 'ApiAliasRecord', {
            zone: hostedZone,
            recordName: props.stage === 'prod' ? 'movie-graph' : `movie-graph-${props.stage}`,
            target: route53.RecordTarget.fromAlias(new targets.ApiGatewayv2DomainProperties(domain.regionalDomainName, domain.regionalHostedZoneId)),
        });
        // Create Neptune Serverless Cluster
        const neptuneCluster = new neptune.CfnDBCluster(this, 'MovieGraphDB', {
            engineVersion: '2.3.1',
            dbClusterIdentifier: `movie-graph-${props.stage}`,
            vpcSecurityGroupIds: [vpc.vpcDefaultSecurityGroup],
            serverlessScalingConfiguration: {
                minCapacity: 1.0, // Minimum NCUs
                maxCapacity: 8.0, // Maximum NCUs
            },
            iamAuthEnabled: true, // Enable IAM authentication
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
        // Outputs
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: `https://${subdomain}`,
            description: 'API Gateway endpoint URL',
        });
        // Add Neptune endpoint to outputs
        new cdk.CfnOutput(this, 'NeptuneEndpoint', {
            value: neptuneCluster.attrEndpoint,
            description: 'Neptune Serverless cluster endpoint',
        });
    }
}
exports.ApiStack = ApiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGliL2FwaS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMseURBQTJDO0FBRTNDLCtEQUFpRDtBQUNqRCw0RUFBOEQ7QUFFOUQsaUVBQW1EO0FBQ25ELHlFQUEyRDtBQUMzRCx3RUFBMEQ7QUFDMUQsaUVBQW1EO0FBQ25ELHlEQUEyQztBQU8zQyxNQUFhLFFBQVMsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNyQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW9CO1FBQzVELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLDZDQUE2QztRQUM3QyxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUM3QyxNQUFNLEVBQUUsQ0FBQztZQUNULG1CQUFtQixFQUFFO2dCQUNuQjtvQkFDRSxRQUFRLEVBQUUsRUFBRTtvQkFDWixJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNO2lCQUNsQztnQkFDRDtvQkFDRSxRQUFRLEVBQUUsRUFBRTtvQkFDWixJQUFJLEVBQUUsU0FBUztvQkFDZixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxtQkFBbUI7aUJBQy9DO2dCQUNEO29CQUNFLFFBQVEsRUFBRSxFQUFFO29CQUNaLElBQUksRUFBRSxVQUFVO29CQUNoQixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0I7aUJBQzVDO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCwwQ0FBMEM7UUFDMUMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFlBQVksRUFB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Y0FBYztnQkFDZCx3QkFBd0I7Z0JBQ3hCLDRCQUE0QjthQUM3QjtZQUNELFNBQVMsRUFBRTtnQkFDVCxzQkFBc0IsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLGNBQWMsQ0FBQyxHQUFHLElBQUk7Z0JBQzNFLG1CQUFtQixJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUk7YUFDbkQ7U0FDRixDQUFDLENBQUMsQ0FBQztRQUVKLHFDQUFxQztRQUNyQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzVDLEtBQUssRUFBRSxjQUFjLENBQUMsWUFBWTtZQUNsQyxXQUFXLEVBQUUscUNBQXFDO1NBQ25ELENBQUMsQ0FBQztRQUVILFVBQVU7UUFDVixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUNoQyxLQUFLLEVBQUUsV0FBVyxTQUFTLEVBQUU7WUFDN0IsV0FBVyxFQUFFLDBCQUEwQjtTQUN4QyxDQUFDLENBQUM7UUFFSCxrQ0FBa0M7UUFDbEMsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUN6QyxLQUFLLEVBQUUsY0FBYyxDQUFDLFlBQVk7WUFDbEMsV0FBVyxFQUFFLHFDQUFxQztTQUNuRCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUEzTEQsNEJBMkxDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCAqIGFzIHJkcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtcmRzJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXl2Mi1hbHBoYSc7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5SW50ZWdyYXRpb25zIGZyb20gJ0Bhd3MtY2RrL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zLWFscGhhJztcbmltcG9ydCAqIGFzIHJvdXRlNTMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMnO1xuaW1wb3J0ICogYXMgdGFyZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1My10YXJnZXRzJztcbmltcG9ydCAqIGFzIGFjbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJztcbmltcG9ydCAqIGFzIG5lcHR1bmUgZnJvbSAnYXdzLWNkay1saWIvYXdzLW5lcHR1bmUnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmludGVyZmFjZSBBcGlTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBzdGFnZTogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgQXBpU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQXBpU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gQ3JlYXRlIFZQQyB3aXRoIHB1YmxpYyBhbmQgcHJpdmF0ZSBzdWJuZXRzXG4gICAgY29uc3QgdnBjID0gbmV3IGVjMi5WcGModGhpcywgJ01vdmllR3JhcGhWUEMnLCB7XG4gICAgICBtYXhBenM6IDIsXG4gICAgICBzdWJuZXRDb25maWd1cmF0aW9uOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBjaWRyTWFzazogMjQsXG4gICAgICAgICAgbmFtZTogJ1B1YmxpYycsXG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFVCTElDLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICAgIG5hbWU6ICdQcml2YXRlJyxcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICAgIG5hbWU6ICdJc29sYXRlZCcsXG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRCxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBMb29rIHVwIHRoZSBob3N0ZWQgem9uZSBmb3IgZ2FiZXRpbW0ubWVcbiAgICBjb25zdCBob3N0ZWRab25lID0gcm91dGU1My5Ib3N0ZWRab25lLmZyb21Mb29rdXAodGhpcywgJ0hvc3RlZFpvbmUnLCB7XG4gICAgICBkb21haW5OYW1lOiAnZ2FiZXRpbW0ubWUnLFxuICAgIH0pO1xuXG4gICAgLy8gR2VuZXJhdGUgc3RhZ2Utc3BlY2lmaWMgc3ViZG9tYWluXG4gICAgY29uc3Qgc3ViZG9tYWluID0gcHJvcHMuc3RhZ2UgPT09ICdwcm9kJyBcbiAgICAgID8gJ21vdmllLWdyYXBoLmdhYmV0aW1tLm1lJ1xuICAgICAgOiBgbW92aWUtZ3JhcGgtJHtwcm9wcy5zdGFnZX0uZ2FiZXRpbW0ubWVgO1xuXG4gICAgLy8gQ3JlYXRlIEFDTSBjZXJ0aWZpY2F0ZSBmb3IgdGhlIHN1YmRvbWFpblxuICAgIGNvbnN0IGNlcnRpZmljYXRlID0gbmV3IGFjbS5DZXJ0aWZpY2F0ZSh0aGlzLCAnQ2VydGlmaWNhdGUnLCB7XG4gICAgICBkb21haW5OYW1lOiBzdWJkb21haW4sXG4gICAgICB2YWxpZGF0aW9uOiBhY20uQ2VydGlmaWNhdGVWYWxpZGF0aW9uLmZyb21EbnMoaG9zdGVkWm9uZSksXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgQVBJIEdhdGV3YXkgSFRUUCBBUElcbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5IdHRwQXBpKHRoaXMsICdNb3ZpZUdyYXBoQXBpJywge1xuICAgICAgY29yc1ByZWZsaWdodDoge1xuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ0F1dGhvcml6YXRpb24nXSxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbXG4gICAgICAgICAgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5HRVQsXG4gICAgICAgICAgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5QT1NULFxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuUFVULFxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuREVMRVRFLFxuICAgICAgICBdLFxuICAgICAgICBhbGxvd09yaWdpbnM6IFsnKiddLFxuICAgICAgICBtYXhBZ2U6IGNkay5EdXJhdGlvbi5kYXlzKDEpLFxuICAgICAgfSxcbiAgICAgIGNyZWF0ZURlZmF1bHRTdGFnZTogdHJ1ZSxcbiAgICAgIGRpc2FibGVFeGVjdXRlQXBpRW5kcG9pbnQ6IHRydWUsIC8vIERpc2FibGUgdGhlIGRlZmF1bHQgZW5kcG9pbnRcbiAgICB9KTtcblxuICAgIC8vIENvbmZpZ3VyZSBjdXN0b20gZG9tYWluXG4gICAgY29uc3QgZG9tYWluID0gbmV3IGFwaWdhdGV3YXkuRG9tYWluTmFtZSh0aGlzLCAnQ3VzdG9tRG9tYWluJywge1xuICAgICAgZG9tYWluTmFtZTogc3ViZG9tYWluLFxuICAgICAgY2VydGlmaWNhdGU6IGNlcnRpZmljYXRlLFxuICAgIH0pO1xuXG4gICAgLy8gTWFwIHRoZSBjdXN0b20gZG9tYWluIHRvIHRoZSBBUElcbiAgICBuZXcgYXBpZ2F0ZXdheS5BcGlNYXBwaW5nKHRoaXMsICdBcGlNYXBwaW5nJywge1xuICAgICAgYXBpLFxuICAgICAgZG9tYWluTmFtZTogZG9tYWluLFxuICAgICAgc3RhZ2U6IGFwaS5kZWZhdWx0U3RhZ2UhLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIFJvdXRlIDUzIGFsaWFzIHJlY29yZFxuICAgIG5ldyByb3V0ZTUzLkFSZWNvcmQodGhpcywgJ0FwaUFsaWFzUmVjb3JkJywge1xuICAgICAgem9uZTogaG9zdGVkWm9uZSxcbiAgICAgIHJlY29yZE5hbWU6IHByb3BzLnN0YWdlID09PSAncHJvZCcgPyAnbW92aWUtZ3JhcGgnIDogYG1vdmllLWdyYXBoLSR7cHJvcHMuc3RhZ2V9YCxcbiAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKG5ldyB0YXJnZXRzLkFwaUdhdGV3YXl2MkRvbWFpblByb3BlcnRpZXMoXG4gICAgICAgIGRvbWFpbi5yZWdpb25hbERvbWFpbk5hbWUsXG4gICAgICAgIGRvbWFpbi5yZWdpb25hbEhvc3RlZFpvbmVJZFxuICAgICAgKSksXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgTmVwdHVuZSBTZXJ2ZXJsZXNzIENsdXN0ZXJcbiAgICBjb25zdCBuZXB0dW5lQ2x1c3RlciA9IG5ldyBuZXB0dW5lLkNmbkRCQ2x1c3Rlcih0aGlzLCAnTW92aWVHcmFwaERCJywge1xuICAgICAgZW5naW5lVmVyc2lvbjogJzIuMy4xJyxcbiAgICAgIGRiQ2x1c3RlcklkZW50aWZpZXI6IGBtb3ZpZS1ncmFwaC0ke3Byb3BzLnN0YWdlfWAsXG4gICAgICB2cGNTZWN1cml0eUdyb3VwSWRzOiBbdnBjLnZwY0RlZmF1bHRTZWN1cml0eUdyb3VwXSxcbiAgICAgIHNlcnZlcmxlc3NTY2FsaW5nQ29uZmlndXJhdGlvbjoge1xuICAgICAgICBtaW5DYXBhY2l0eTogMS4wLCAvLyBNaW5pbXVtIE5DVXNcbiAgICAgICAgbWF4Q2FwYWNpdHk6IDguMCwgLy8gTWF4aW11bSBOQ1VzXG4gICAgICB9LFxuICAgICAgaWFtQXV0aEVuYWJsZWQ6IHRydWUsIC8vIEVuYWJsZSBJQU0gYXV0aGVudGljYXRpb25cbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBJQU0gcm9sZSBmb3IgTmVwdHVuZSBsb2FkZXJcbiAgICBjb25zdCBsb2FkZXJSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdOZXB0dW5lTG9hZGVyUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdyZHMuYW1hem9uYXdzLmNvbScpLFxuICAgICAgZGVzY3JpcHRpb246ICdJQU0gcm9sZSBmb3IgTmVwdHVuZSBidWxrIGxvYWRlcicsXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBhY2Nlc3MgdG8gUzMgYnVja2V0XG4gICAgbG9hZGVyUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdzMzpHZXQqJyxcbiAgICAgICAgJ3MzOkxpc3QqJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgJ2Fybjphd3M6czM6Ojptb3ZpZS1ncmFwaC1iaW4nLFxuICAgICAgICAnYXJuOmF3czpzMzo6Om1vdmllLWdyYXBoLWJpbi8qJyxcbiAgICAgIF0sXG4gICAgfSkpO1xuXG4gICAgLy8gQ3JlYXRlIE5lcHR1bmUgbG9hZGVyIGZ1bmN0aW9uXG4gICAgY29uc3QgbG9hZGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdOZXB0dW5lTG9hZGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21JbmxpbmUoYFxuICAgICAgICBjb25zdCBBV1MgPSByZXF1aXJlKCdhd3Mtc2RrJyk7XG4gICAgICAgIGNvbnN0IG5lcHR1bmUgPSBuZXcgQVdTLk5lcHR1bmUoKTtcbiAgICAgICAgXG4gICAgICAgIGV4cG9ydHMuaGFuZGxlciA9IGFzeW5jIChldmVudCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIFNvdXJjZTogJ3MzOi8vbW92aWUtZ3JhcGgtYmluJyxcbiAgICAgICAgICAgIEZvcm1hdDogJ2NzdicsXG4gICAgICAgICAgICBSZWdpb246ICcke3RoaXMucmVnaW9ufScsXG4gICAgICAgICAgICBJYW1Sb2xlQXJuOiAnJHtsb2FkZXJSb2xlLnJvbGVBcm59JyxcbiAgICAgICAgICAgIEZhaWxPbkVycm9yOiAnVFJVRScsXG4gICAgICAgICAgICBQYXJhbGxlbGlzbTogJ01FRElVTScsXG4gICAgICAgICAgfTtcbiAgICAgICAgICBcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBuZXB0dW5lLnN0YXJ0TG9hZGVySm9iKHtcbiAgICAgICAgICAgICAgLi4ucGFyYW1zLFxuICAgICAgICAgICAgICBMb2FkZXJKb2JJZDogXFxgbG9hZC1cXCR7RGF0ZS5ub3coKX1cXGAsXG4gICAgICAgICAgICB9KS5wcm9taXNlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTdGFydGVkIE5lcHR1bmUgbG9hZGVyIGpvYjonLCByZXNwb25zZSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHN0YXJ0aW5nIGxvYWRlciBqb2I6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBgKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIE5FUFRVTkVfRU5EUE9JTlQ6IG5lcHR1bmVDbHVzdGVyLmF0dHJFbmRwb2ludCxcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgIHZwYyxcbiAgICAgIHZwY1N1Ym5ldHM6IHtcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBsb2FkZXIgZnVuY3Rpb24gcGVybWlzc2lvbnMgdG8gc3RhcnQgbG9hZGVyIGpvYnNcbiAgICBsb2FkZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnbmVwdHVuZS1kYjoqJyxcbiAgICAgICAgJ25lcHR1bmU6U3RhcnRMb2FkZXJKb2InLFxuICAgICAgICAnbmVwdHVuZTpHZXRMb2FkZXJKb2JTdGF0dXMnLFxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgYXJuOmF3czpuZXB0dW5lLWRiOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fToke25lcHR1bmVDbHVzdGVyLnJlZn0vKmAsXG4gICAgICAgIGBhcm46YXdzOm5lcHR1bmU6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OipgLFxuICAgICAgXSxcbiAgICB9KSk7XG5cbiAgICAvLyBBZGQgbG9hZGVyIGZ1bmN0aW9uIFVSTCB0byBvdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xvYWRlckZ1bmN0aW9uTmFtZScsIHtcbiAgICAgIHZhbHVlOiBsb2FkZXJGdW5jdGlvbi5mdW5jdGlvbk5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ05lcHR1bmUgbG9hZGVyIExhbWJkYSBmdW5jdGlvbiBuYW1lJyxcbiAgICB9KTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpVXJsJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7c3ViZG9tYWlufWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IGVuZHBvaW50IFVSTCcsXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgTmVwdHVuZSBlbmRwb2ludCB0byBvdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ05lcHR1bmVFbmRwb2ludCcsIHtcbiAgICAgIHZhbHVlOiBuZXB0dW5lQ2x1c3Rlci5hdHRyRW5kcG9pbnQsXG4gICAgICBkZXNjcmlwdGlvbjogJ05lcHR1bmUgU2VydmVybGVzcyBjbHVzdGVyIGVuZHBvaW50JyxcbiAgICB9KTtcbiAgfVxufSAiXX0=