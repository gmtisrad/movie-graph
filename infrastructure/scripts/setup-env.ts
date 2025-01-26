#!/usr/bin/env node
import { CloudFormation, Output } from '@aws-sdk/client-cloudformation';
import * as fs from 'fs';
import * as path from 'path';

async function getStackOutputs(stackName: string): Promise<Output[]> {
  const cfn = new CloudFormation({ region: process.env.CDK_DEFAULT_REGION });
  const { Stacks } = await cfn.describeStacks({ StackName: stackName });
  return Stacks?.[0].Outputs || [];
}

async function setupEnvFiles() {
  const stage = process.env.STAGE || 'dev';
  
  // Get outputs from all stacks
  const dbOutputs = await getStackOutputs(`MovieGraphDB-${stage}`);
  const computeOutputs = await getStackOutputs(`MovieGraphCompute-${stage}`);

  // Create environment files
  const envFiles = {
    '../services/graph-api/.env': [
      `NEPTUNE_ENDPOINT=${dbOutputs.find((o: Output) => o.OutputKey === 'NeptuneEndpoint')?.OutputValue}`,
      'NEPTUNE_PORT=8182'
    ],
    '../services/metadata-api/.env': [
      `RDS_SECRET_ARN=${dbOutputs.find((o: Output) => o.OutputKey === 'DbSecretArn')?.OutputValue}`,
      `RDS_ENDPOINT=${dbOutputs.find((o: Output) => o.OutputKey === 'RdsEndpoint')?.OutputValue}`
    ],
    '../services/gateway-api/.env': [
      `GRAPH_API_URL=${computeOutputs.find((o: Output) => o.OutputKey === 'ApiUrl')?.OutputValue}/graph`,
      `METADATA_API_URL=${computeOutputs.find((o: Output) => o.OutputKey === 'ApiUrl')?.OutputValue}/metadata`
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