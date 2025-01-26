import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { HttpRequest } from '@aws-sdk/protocol-http';
import * as https from 'https';

export const handler = async (event: any) => {
  const neptuneEndpoint = process.env.NEPTUNE_ENDPOINT;
  const region = process.env.AWS_REGION;
  
  if (!neptuneEndpoint || !region) {
    throw new Error('Missing required environment variables');
  }

  const request = new HttpRequest({
    hostname: neptuneEndpoint,
    path: '/loader',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      host: neptuneEndpoint
    },
    body: JSON.stringify(event.body)
  });

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region,
    service: 'neptune-db',
    sha256: Sha256
  });

  const signedRequest = await signer.sign(request);
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      ...request,
      headers: signedRequest.headers,
      port: 8182
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        body: data
      }));
    });
    
    req.on('error', reject);
    req.write(request.body);
    req.end();
  });
}; 