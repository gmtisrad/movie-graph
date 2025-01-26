#!/usr/bin/env node
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
const client_cloudformation_1 = require("@aws-sdk/client-cloudformation");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function getStackOutputs(stackName) {
    const cfn = new client_cloudformation_1.CloudFormation({ region: process.env.CDK_DEFAULT_REGION });
    const { Stacks } = await cfn.describeStacks({ StackName: stackName });
    return (Stacks === null || Stacks === void 0 ? void 0 : Stacks[0].Outputs) || [];
}
async function setupEnvFiles() {
    var _a, _b, _c, _d, _e;
    const stage = process.env.STAGE || 'dev';
    // Get outputs from all stacks
    const dbOutputs = await getStackOutputs(`MovieGraphDB-${stage}`);
    const computeOutputs = await getStackOutputs(`MovieGraphCompute-${stage}`);
    // Create environment files
    const envFiles = {
        '../services/graph-api/.env': [
            `NEPTUNE_ENDPOINT=${(_a = dbOutputs.find((o) => o.OutputKey === 'NeptuneEndpoint')) === null || _a === void 0 ? void 0 : _a.OutputValue}`,
            'NEPTUNE_PORT=8182'
        ],
        '../services/metadata-api/.env': [
            `RDS_SECRET_ARN=${(_b = dbOutputs.find((o) => o.OutputKey === 'DbSecretArn')) === null || _b === void 0 ? void 0 : _b.OutputValue}`,
            `RDS_ENDPOINT=${(_c = dbOutputs.find((o) => o.OutputKey === 'RdsEndpoint')) === null || _c === void 0 ? void 0 : _c.OutputValue}`
        ],
        '../services/gateway-api/.env': [
            `GRAPH_API_URL=${(_d = computeOutputs.find((o) => o.OutputKey === 'ApiUrl')) === null || _d === void 0 ? void 0 : _d.OutputValue}/graph`,
            `METADATA_API_URL=${(_e = computeOutputs.find((o) => o.OutputKey === 'ApiUrl')) === null || _e === void 0 ? void 0 : _e.OutputValue}/metadata`
        ]
    };
    // Write files
    for (const [filePath, contents] of Object.entries(envFiles)) {
        const fullPath = path.resolve(__dirname, filePath);
        fs.writeFileSync(fullPath, contents.join('\n') + '\n');
        console.log(`Created ${filePath}`);
    }
}
setupEnvFiles().catch(console.error);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dXAtZW52LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc2NyaXB0cy9zZXR1cC1lbnYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsMEVBQXdFO0FBQ3hFLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFFN0IsS0FBSyxVQUFVLGVBQWUsQ0FBQyxTQUFpQjtJQUM5QyxNQUFNLEdBQUcsR0FBRyxJQUFJLHNDQUFjLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUM7SUFDM0UsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO0lBQ3RFLE9BQU8sQ0FBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUcsQ0FBQyxFQUFFLE9BQU8sS0FBSSxFQUFFLENBQUM7QUFDbkMsQ0FBQztBQUVELEtBQUssVUFBVSxhQUFhOztJQUMxQixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUM7SUFFekMsOEJBQThCO0lBQzlCLE1BQU0sU0FBUyxHQUFHLE1BQU0sZUFBZSxDQUFDLGdCQUFnQixLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ2pFLE1BQU0sY0FBYyxHQUFHLE1BQU0sZUFBZSxDQUFDLHFCQUFxQixLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBRTNFLDJCQUEyQjtJQUMzQixNQUFNLFFBQVEsR0FBRztRQUNmLDRCQUE0QixFQUFFO1lBQzVCLG9CQUFvQixNQUFBLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEtBQUssaUJBQWlCLENBQUMsMENBQUUsV0FBVyxFQUFFO1lBQ25HLG1CQUFtQjtTQUNwQjtRQUNELCtCQUErQixFQUFFO1lBQy9CLGtCQUFrQixNQUFBLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEtBQUssYUFBYSxDQUFDLDBDQUFFLFdBQVcsRUFBRTtZQUM3RixnQkFBZ0IsTUFBQSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxLQUFLLGFBQWEsQ0FBQywwQ0FBRSxXQUFXLEVBQUU7U0FDNUY7UUFDRCw4QkFBOEIsRUFBRTtZQUM5QixpQkFBaUIsTUFBQSxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxLQUFLLFFBQVEsQ0FBQywwQ0FBRSxXQUFXLFFBQVE7WUFDbEcsb0JBQW9CLE1BQUEsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsS0FBSyxRQUFRLENBQUMsMENBQUUsV0FBVyxXQUFXO1NBQ3pHO0tBQ0YsQ0FBQztJQUVGLGNBQWM7SUFDZCxLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQzVELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ25ELEVBQUUsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDdkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDckMsQ0FBQztBQUNILENBQUM7QUFFRCxhQUFhLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0IHsgQ2xvdWRGb3JtYXRpb24sIE91dHB1dCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jbG91ZGZvcm1hdGlvbic7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5hc3luYyBmdW5jdGlvbiBnZXRTdGFja091dHB1dHMoc3RhY2tOYW1lOiBzdHJpbmcpOiBQcm9taXNlPE91dHB1dFtdPiB7XG4gIGNvbnN0IGNmbiA9IG5ldyBDbG91ZEZvcm1hdGlvbih7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OIH0pO1xuICBjb25zdCB7IFN0YWNrcyB9ID0gYXdhaXQgY2ZuLmRlc2NyaWJlU3RhY2tzKHsgU3RhY2tOYW1lOiBzdGFja05hbWUgfSk7XG4gIHJldHVybiBTdGFja3M/LlswXS5PdXRwdXRzIHx8IFtdO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzZXR1cEVudkZpbGVzKCkge1xuICBjb25zdCBzdGFnZSA9IHByb2Nlc3MuZW52LlNUQUdFIHx8ICdkZXYnO1xuICBcbiAgLy8gR2V0IG91dHB1dHMgZnJvbSBhbGwgc3RhY2tzXG4gIGNvbnN0IGRiT3V0cHV0cyA9IGF3YWl0IGdldFN0YWNrT3V0cHV0cyhgTW92aWVHcmFwaERCLSR7c3RhZ2V9YCk7XG4gIGNvbnN0IGNvbXB1dGVPdXRwdXRzID0gYXdhaXQgZ2V0U3RhY2tPdXRwdXRzKGBNb3ZpZUdyYXBoQ29tcHV0ZS0ke3N0YWdlfWApO1xuXG4gIC8vIENyZWF0ZSBlbnZpcm9ubWVudCBmaWxlc1xuICBjb25zdCBlbnZGaWxlcyA9IHtcbiAgICAnLi4vc2VydmljZXMvZ3JhcGgtYXBpLy5lbnYnOiBbXG4gICAgICBgTkVQVFVORV9FTkRQT0lOVD0ke2RiT3V0cHV0cy5maW5kKChvOiBPdXRwdXQpID0+IG8uT3V0cHV0S2V5ID09PSAnTmVwdHVuZUVuZHBvaW50Jyk/Lk91dHB1dFZhbHVlfWAsXG4gICAgICAnTkVQVFVORV9QT1JUPTgxODInXG4gICAgXSxcbiAgICAnLi4vc2VydmljZXMvbWV0YWRhdGEtYXBpLy5lbnYnOiBbXG4gICAgICBgUkRTX1NFQ1JFVF9BUk49JHtkYk91dHB1dHMuZmluZCgobzogT3V0cHV0KSA9PiBvLk91dHB1dEtleSA9PT0gJ0RiU2VjcmV0QXJuJyk/Lk91dHB1dFZhbHVlfWAsXG4gICAgICBgUkRTX0VORFBPSU5UPSR7ZGJPdXRwdXRzLmZpbmQoKG86IE91dHB1dCkgPT4gby5PdXRwdXRLZXkgPT09ICdSZHNFbmRwb2ludCcpPy5PdXRwdXRWYWx1ZX1gXG4gICAgXSxcbiAgICAnLi4vc2VydmljZXMvZ2F0ZXdheS1hcGkvLmVudic6IFtcbiAgICAgIGBHUkFQSF9BUElfVVJMPSR7Y29tcHV0ZU91dHB1dHMuZmluZCgobzogT3V0cHV0KSA9PiBvLk91dHB1dEtleSA9PT0gJ0FwaVVybCcpPy5PdXRwdXRWYWx1ZX0vZ3JhcGhgLFxuICAgICAgYE1FVEFEQVRBX0FQSV9VUkw9JHtjb21wdXRlT3V0cHV0cy5maW5kKChvOiBPdXRwdXQpID0+IG8uT3V0cHV0S2V5ID09PSAnQXBpVXJsJyk/Lk91dHB1dFZhbHVlfS9tZXRhZGF0YWBcbiAgICBdXG4gIH07XG5cbiAgLy8gV3JpdGUgZmlsZXNcbiAgZm9yIChjb25zdCBbZmlsZVBhdGgsIGNvbnRlbnRzXSBvZiBPYmplY3QuZW50cmllcyhlbnZGaWxlcykpIHtcbiAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIGZpbGVQYXRoKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGZ1bGxQYXRoLCBjb250ZW50cy5qb2luKCdcXG4nKSArICdcXG4nKTtcbiAgICBjb25zb2xlLmxvZyhgQ3JlYXRlZCAke2ZpbGVQYXRofWApO1xuICB9XG59XG5cbnNldHVwRW52RmlsZXMoKS5jYXRjaChjb25zb2xlLmVycm9yKTsgIl19