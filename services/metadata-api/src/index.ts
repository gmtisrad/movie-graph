import express from 'express';
import serverless from '@vendia/serverless-express';
import { APIGatewayProxyHandler } from 'aws-lambda';
import cors from 'cors';
import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

// Create Express app
const app = express();

// Configure middleware
app.use(cors());
app.use(express.json());

// Create database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  // Add connection pool limits
  max: 20, // Maximum number of clients
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Add pool error handler
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Movie endpoints
app.get('/movies/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const result = await client.query(
      'SELECT * FROM movies WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Movie not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching movie:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.get('/movies', async (req, res) => {
  const client = await pool.connect();
  try {
    const { search, limit = '10', offset = '0' } = req.query;
    let query = 'SELECT * FROM movies';
    const params: any[] = [];
    
    if (search) {
      query += ' WHERE primary_title ILIKE $1';
      params.push(`%${search}%`);
    }
    
    query += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await client.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Person endpoints
app.get('/people/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const result = await client.query(
      'SELECT * FROM people WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Person not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching person:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.get('/people', async (req, res) => {
  const client = await pool.connect();
  try {
    const { search, limit = '10', offset = '0' } = req.query;
    let query = 'SELECT * FROM people';
    const params: any[] = [];
    
    if (search) {
      query += ' WHERE primary_name ILIKE $1';
      params.push(`%${search}%`);
    }
    
    query += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await client.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching people:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Cleaning up...');
  await pool.end();
  process.exit(0);
});

// Create serverless handler
export const handler: APIGatewayProxyHandler = serverless({ app }); 