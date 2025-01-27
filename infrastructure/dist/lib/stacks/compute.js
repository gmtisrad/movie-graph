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
exports.ComputeStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigw = __importStar(require("aws-cdk-lib/aws-apigateway"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
class ComputeStack extends cdk.Stack {
    constructor(scope, id, props) {
        var _a;
        super(scope, id, props);
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
        // Create Neptune loader function
        const loaderFunction = new lambda.Function(this, 'NeptuneLoaderFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const neptune = new AWS.Neptune();
        
        exports.handler = async (event) => {
          const params = {
            Source: 's3://movie-graph-bin',
            Format: 'csv',
            Region: '${this.region}',
            IamRoleArn: '${props.neptuneCluster.attrEndpoint}',
            FailOnError: 'TRUE',
            Parallelism: 'MEDIUM',
          };
          
          try {
            const response = await neptune.startLoaderJob({
              ...params,
              LoaderJobId: \`load-\${Date.now()}\`,
            }).promise();
            
            console.log('Started Neptune loader job:', response);
            return response;
          } catch (error) {
            console.error('Error starting loader job:', error);
            throw error;
          }
        }
      `),
            environment: {
                NEPTUNE_ENDPOINT: props.neptuneCluster.attrEndpoint,
                RDS_SECRET_ARN: ((_a = props.rdsInstance.secret) === null || _a === void 0 ? void 0 : _a.secretArn) || '',
                RDS_ENDPOINT: props.rdsInstance.instanceEndpoint.hostname,
            },
            timeout: cdk.Duration.minutes(5),
            vpc: props.vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
        });
        // Create API Gateway REST API
        const api = new apigw.RestApi(this, 'MovieGraphApi', {
            restApiName: `movie-graph-${props.stage}`,
            description: 'Movie Graph API',
            defaultCorsPreflightOptions: {
                allowHeaders: ['Content-Type', 'Authorization'],
                allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
                allowOrigins: ['*'],
                maxAge: cdk.Duration.days(1),
            },
            domainName: {
                domainName: subdomain,
                certificate: certificate,
            },
            endpointTypes: [apigw.EndpointType.REGIONAL],
            deployOptions: {
                stageName: props.stage,
                tracingEnabled: true,
            },
        });
        // Create Route 53 alias record
        new route53.ARecord(this, 'ApiAliasRecord', {
            zone: hostedZone,
            recordName: props.stage === 'prod' ? 'movie-graph' : `movie-graph-${props.stage}`,
            target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api)),
        });
        // Add outputs
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: `https://${subdomain}`,
            description: 'API Gateway endpoint URL',
        });
    }
}
exports.ComputeStack = ComputeStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHV0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9zdGFja3MvY29tcHV0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMseURBQTJDO0FBQzNDLCtEQUFpRDtBQUNqRCxrRUFBb0Q7QUFDcEQsaUVBQW1EO0FBQ25ELHlFQUEyRDtBQUMzRCx3RUFBMEQ7QUFZMUQsTUFBYSxZQUFhLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDekMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF3Qjs7UUFDaEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsMENBQTBDO1FBQzFDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDbkUsVUFBVSxFQUFFLGFBQWE7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsb0NBQW9DO1FBQ3BDLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxLQUFLLEtBQUssTUFBTTtZQUN0QyxDQUFDLENBQUMseUJBQXlCO1lBQzNCLENBQUMsQ0FBQyxlQUFlLEtBQUssQ0FBQyxLQUFLLGNBQWMsQ0FBQztRQUU3QywyQ0FBMkM7UUFDM0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDM0QsVUFBVSxFQUFFLFNBQVM7WUFDckIsVUFBVSxFQUFFLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO1NBQzFELENBQUMsQ0FBQztRQUVILGlDQUFpQztRQUNqQyxNQUFNLGNBQWMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQ3hFLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDOzs7Ozs7Ozt1QkFRWixJQUFJLENBQUMsTUFBTTsyQkFDUCxLQUFLLENBQUMsY0FBYyxDQUFDLFlBQVk7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQWtCckQsQ0FBQztZQUNGLFdBQVcsRUFBRTtnQkFDWCxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsY0FBYyxDQUFDLFlBQVk7Z0JBQ25ELGNBQWMsRUFBRSxDQUFBLE1BQUEsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLDBDQUFFLFNBQVMsS0FBSSxFQUFFO2dCQUN6RCxZQUFZLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRO2FBQzFEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNoQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUc7WUFDZCxVQUFVLEVBQUU7Z0JBQ1YsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsbUJBQW1CO2FBQy9DO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsOEJBQThCO1FBQzlCLE1BQU0sR0FBRyxHQUFHLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ25ELFdBQVcsRUFBRSxlQUFlLEtBQUssQ0FBQyxLQUFLLEVBQUU7WUFDekMsV0FBVyxFQUFFLGlCQUFpQjtZQUM5QiwyQkFBMkIsRUFBRTtnQkFDM0IsWUFBWSxFQUFFLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQztnQkFDL0MsWUFBWSxFQUFFLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDO2dCQUM5QyxZQUFZLEVBQUUsQ0FBQyxHQUFHLENBQUM7Z0JBQ25CLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDN0I7WUFDRCxVQUFVLEVBQUU7Z0JBQ1YsVUFBVSxFQUFFLFNBQVM7Z0JBQ3JCLFdBQVcsRUFBRSxXQUFXO2FBQ3pCO1lBQ0QsYUFBYSxFQUFFLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUM7WUFDNUMsYUFBYSxFQUFFO2dCQUNiLFNBQVMsRUFBRSxLQUFLLENBQUMsS0FBSztnQkFDdEIsY0FBYyxFQUFFLElBQUk7YUFDckI7U0FDRixDQUFDLENBQUM7UUFFSCwrQkFBK0I7UUFDL0IsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUMxQyxJQUFJLEVBQUUsVUFBVTtZQUNoQixVQUFVLEVBQUUsS0FBSyxDQUFDLEtBQUssS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsZUFBZSxLQUFLLENBQUMsS0FBSyxFQUFFO1lBQ2pGLE1BQU0sRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FDcEMsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUM1QjtTQUNGLENBQUMsQ0FBQztRQUVILGNBQWM7UUFDZCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUNoQyxLQUFLLEVBQUUsV0FBVyxTQUFTLEVBQUU7WUFDN0IsV0FBVyxFQUFFLDBCQUEwQjtTQUN4QyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzVDLEtBQUssRUFBRSxjQUFjLENBQUMsWUFBWTtZQUNsQyxXQUFXLEVBQUUscUNBQXFDO1NBQ25ELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXpHRCxvQ0F5R0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgYXBpZ3cgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzLXRhcmdldHMnO1xuaW1wb3J0ICogYXMgYWNtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xuaW1wb3J0ICogYXMgbmVwdHVuZSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbmVwdHVuZSc7XG5pbXBvcnQgKiBhcyByZHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJkcyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuaW50ZXJmYWNlIENvbXB1dGVTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBzdGFnZTogc3RyaW5nO1xuICB2cGM6IGVjMi5JVnBjO1xuICBuZXB0dW5lQ2x1c3RlcjogbmVwdHVuZS5DZm5EQkNsdXN0ZXI7XG4gIHJkc0luc3RhbmNlOiByZHMuRGF0YWJhc2VJbnN0YW5jZTtcbn1cblxuZXhwb3J0IGNsYXNzIENvbXB1dGVTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDb21wdXRlU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gTG9vayB1cCB0aGUgaG9zdGVkIHpvbmUgZm9yIGdhYmV0aW1tLm1lXG4gICAgY29uc3QgaG9zdGVkWm9uZSA9IHJvdXRlNTMuSG9zdGVkWm9uZS5mcm9tTG9va3VwKHRoaXMsICdIb3N0ZWRab25lJywge1xuICAgICAgZG9tYWluTmFtZTogJ2dhYmV0aW1tLm1lJyxcbiAgICB9KTtcblxuICAgIC8vIEdlbmVyYXRlIHN0YWdlLXNwZWNpZmljIHN1YmRvbWFpblxuICAgIGNvbnN0IHN1YmRvbWFpbiA9IHByb3BzLnN0YWdlID09PSAncHJvZCcgXG4gICAgICA/ICdtb3ZpZS1ncmFwaC5nYWJldGltbS5tZSdcbiAgICAgIDogYG1vdmllLWdyYXBoLSR7cHJvcHMuc3RhZ2V9LmdhYmV0aW1tLm1lYDtcblxuICAgIC8vIENyZWF0ZSBBQ00gY2VydGlmaWNhdGUgZm9yIHRoZSBzdWJkb21haW5cbiAgICBjb25zdCBjZXJ0aWZpY2F0ZSA9IG5ldyBhY20uQ2VydGlmaWNhdGUodGhpcywgJ0NlcnRpZmljYXRlJywge1xuICAgICAgZG9tYWluTmFtZTogc3ViZG9tYWluLFxuICAgICAgdmFsaWRhdGlvbjogYWNtLkNlcnRpZmljYXRlVmFsaWRhdGlvbi5mcm9tRG5zKGhvc3RlZFpvbmUpLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIE5lcHR1bmUgbG9hZGVyIGZ1bmN0aW9uXG4gICAgY29uc3QgbG9hZGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdOZXB0dW5lTG9hZGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21JbmxpbmUoYFxuICAgICAgICBjb25zdCBBV1MgPSByZXF1aXJlKCdhd3Mtc2RrJyk7XG4gICAgICAgIGNvbnN0IG5lcHR1bmUgPSBuZXcgQVdTLk5lcHR1bmUoKTtcbiAgICAgICAgXG4gICAgICAgIGV4cG9ydHMuaGFuZGxlciA9IGFzeW5jIChldmVudCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIFNvdXJjZTogJ3MzOi8vbW92aWUtZ3JhcGgtYmluJyxcbiAgICAgICAgICAgIEZvcm1hdDogJ2NzdicsXG4gICAgICAgICAgICBSZWdpb246ICcke3RoaXMucmVnaW9ufScsXG4gICAgICAgICAgICBJYW1Sb2xlQXJuOiAnJHtwcm9wcy5uZXB0dW5lQ2x1c3Rlci5hdHRyRW5kcG9pbnR9JyxcbiAgICAgICAgICAgIEZhaWxPbkVycm9yOiAnVFJVRScsXG4gICAgICAgICAgICBQYXJhbGxlbGlzbTogJ01FRElVTScsXG4gICAgICAgICAgfTtcbiAgICAgICAgICBcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBuZXB0dW5lLnN0YXJ0TG9hZGVySm9iKHtcbiAgICAgICAgICAgICAgLi4ucGFyYW1zLFxuICAgICAgICAgICAgICBMb2FkZXJKb2JJZDogXFxgbG9hZC1cXCR7RGF0ZS5ub3coKX1cXGAsXG4gICAgICAgICAgICB9KS5wcm9taXNlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTdGFydGVkIE5lcHR1bmUgbG9hZGVyIGpvYjonLCByZXNwb25zZSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHN0YXJ0aW5nIGxvYWRlciBqb2I6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBgKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIE5FUFRVTkVfRU5EUE9JTlQ6IHByb3BzLm5lcHR1bmVDbHVzdGVyLmF0dHJFbmRwb2ludCxcbiAgICAgICAgUkRTX1NFQ1JFVF9BUk46IHByb3BzLnJkc0luc3RhbmNlLnNlY3JldD8uc2VjcmV0QXJuIHx8ICcnLFxuICAgICAgICBSRFNfRU5EUE9JTlQ6IHByb3BzLnJkc0luc3RhbmNlLmluc3RhbmNlRW5kcG9pbnQuaG9zdG5hbWUsXG4gICAgICB9LFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICB2cGM6IHByb3BzLnZwYyxcbiAgICAgIHZwY1N1Ym5ldHM6IHtcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgQVBJIEdhdGV3YXkgUkVTVCBBUElcbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ3cuUmVzdEFwaSh0aGlzLCAnTW92aWVHcmFwaEFwaScsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiBgbW92aWUtZ3JhcGgtJHtwcm9wcy5zdGFnZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdNb3ZpZSBHcmFwaCBBUEknLFxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCAnQXV0aG9yaXphdGlvbiddLFxuICAgICAgICBhbGxvd01ldGhvZHM6IFsnR0VUJywgJ1BPU1QnLCAnUFVUJywgJ0RFTEVURSddLFxuICAgICAgICBhbGxvd09yaWdpbnM6IFsnKiddLFxuICAgICAgICBtYXhBZ2U6IGNkay5EdXJhdGlvbi5kYXlzKDEpLFxuICAgICAgfSxcbiAgICAgIGRvbWFpbk5hbWU6IHtcbiAgICAgICAgZG9tYWluTmFtZTogc3ViZG9tYWluLFxuICAgICAgICBjZXJ0aWZpY2F0ZTogY2VydGlmaWNhdGUsXG4gICAgICB9LFxuICAgICAgZW5kcG9pbnRUeXBlczogW2FwaWd3LkVuZHBvaW50VHlwZS5SRUdJT05BTF0sXG4gICAgICBkZXBsb3lPcHRpb25zOiB7XG4gICAgICAgIHN0YWdlTmFtZTogcHJvcHMuc3RhZ2UsXG4gICAgICAgIHRyYWNpbmdFbmFibGVkOiB0cnVlLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBSb3V0ZSA1MyBhbGlhcyByZWNvcmRcbiAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsICdBcGlBbGlhc1JlY29yZCcsIHtcbiAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXG4gICAgICByZWNvcmROYW1lOiBwcm9wcy5zdGFnZSA9PT0gJ3Byb2QnID8gJ21vdmllLWdyYXBoJyA6IGBtb3ZpZS1ncmFwaC0ke3Byb3BzLnN0YWdlfWAsXG4gICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhcbiAgICAgICAgbmV3IHRhcmdldHMuQXBpR2F0ZXdheShhcGkpXG4gICAgICApLFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIG91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpVXJsJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7c3ViZG9tYWlufWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IGVuZHBvaW50IFVSTCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTG9hZGVyRnVuY3Rpb25OYW1lJywge1xuICAgICAgdmFsdWU6IGxvYWRlckZ1bmN0aW9uLmZ1bmN0aW9uTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnTmVwdHVuZSBsb2FkZXIgTGFtYmRhIGZ1bmN0aW9uIG5hbWUnLFxuICAgIH0pO1xuICB9XG59ICJdfQ==