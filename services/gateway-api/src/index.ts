import express from 'express';
import cors from 'cors';
import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from 'dotenv';
import { z } from 'zod';
import { ErrorResponse } from '@movie-graph/types';
import fetch from 'node-fetch';

// Load environment variables
config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Environment validation
const EnvSchema = z.object({
  PORT: z.string().default('3000'),
  METADATA_API_URL: z.string().url(),
  GRAPH_API_URL: z.string().url(),
  IS_LAMBDA: z.boolean().default(false)
});

const env = EnvSchema.parse({
  ...process.env,
  // In Lambda, these would be internal AWS service URLs
  METADATA_API_URL: process.env.IS_LAMBDA 
    ? process.env.METADATA_API_URL 
    : 'http://metadata-api:3001',
  GRAPH_API_URL: process.env.IS_LAMBDA
    ? process.env.GRAPH_API_URL
    : 'http://graph-api:3002'
});

// Proxy middleware setup
const createServiceProxy = (target: string, serviceName: string) => createProxyMiddleware({
  target,
  changeOrigin: true,
  pathRewrite: {
    [`^/api/${serviceName}`]: '', // Remove /api/serviceName prefix when forwarding
  },
  onError: (err, req, res) => {
    const error: ErrorResponse = {
      error: `${serviceName} service unavailable`,
      code: 'SERVICE_UNAVAILABLE',
      details: err.message
    };
    res.status(503).json(error);
  }
});

// Routes for local development
if (!env.IS_LAMBDA) {
  app.use('/api/metadata', createServiceProxy(env.METADATA_API_URL, 'metadata'));
  app.use('/api/graph', createServiceProxy(env.GRAPH_API_URL, 'graph'));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  // Error handling
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    const error: ErrorResponse = {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: err.message
    };
    res.status(500).json(error);
  });

  // Start local server
  const port = parseInt(env.PORT, 10);
  app.listen(port, () => {
    console.log(`Gateway API listening at http://localhost:${port}`);
  });
}

// Lambda handler
export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    // Extract the service from the path
    const path = event.path;
    const service = path.startsWith('/api/metadata') ? 'metadata' : 'graph';
    const targetUrl = service === 'metadata' ? env.METADATA_API_URL : env.GRAPH_API_URL;

    // Forward the request using node-fetch
    const response = await fetch(`${targetUrl}${path.replace(`/api/${service}`, '')}`, {
      method: event.httpMethod,
      headers: event.headers as any,
      body: event.body ? event.body : undefined
    });

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: await response.text()
    };
  } catch (error) {
    console.error('Error in Lambda handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as ErrorResponse)
    };
  }
}; 