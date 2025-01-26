import express from 'express';
import serverless from '@vendia/serverless-express';
import { APIGatewayProxyHandler } from 'aws-lambda';
import cors from 'cors';
import { driver, process as gprocess } from 'gremlin';
import { config } from 'dotenv';

// Load environment variables
config();

// Create Express app
const app = express();

// Configure middleware
app.use(cors());
app.use(express.json());

// Configure Gremlin client
const client = new driver.Client(
  'wss://' + process.env.NEPTUNE_ENDPOINT + ':' + process.env.NEPTUNE_PORT + '/gremlin',
  {
    traversalSource: 'g',
    mimeType: 'application/vnd.gremlin-v2.0+json',
    rejectUnauthorized: process.env.NODE_ENV !== 'production',
    connectOnStartup: true,
    maxInProcessPerConnection: 32,
    maxConnectionPoolSize: 10,
  }
);

// Add client error handler
client.on('error', (err) => {
  console.error('Gremlin client error:', err);
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await client.submit('g.V().limit(1)');
    res.json({ status: 'healthy' });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ status: 'unhealthy', error: 'Database connection failed' });
  }
});

// Graph traversal endpoints
app.get('/movies/:id/cast', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = '10', offset = '0' } = req.query;
    
    const result = await client.submit(
      'g.V().has("movie", "id", movieId)' +
      '.outE("appears_in").inV()' +
      '.range(offset, offset + limit)' +
      '.project("id", "label", "properties")' +
      '.by(id)' +
      '.by(label)' +
      '.by(valueMap())',
      {
        movieId: id,
        offset: parseInt(offset as string),
        limit: parseInt(limit as string),
      }
    );
    
    if (!result._items || result._items.length === 0) {
      res.status(404).json({ error: 'Movie or cast not found' });
      return;
    }
    
    res.json(result._items);
  } catch (error) {
    console.error('Error fetching movie cast:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/people/:id/movies', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = '10', offset = '0' } = req.query;
    
    const result = await client.submit(
      'g.V().has("person", "id", personId)' +
      '.inE("appears_in").outV()' +
      '.range(offset, offset + limit)' +
      '.project("id", "label", "properties")' +
      '.by(id)' +
      '.by(label)' +
      '.by(valueMap())',
      {
        personId: id,
        offset: parseInt(offset as string),
        limit: parseInt(limit as string),
      }
    );
    
    if (!result._items || result._items.length === 0) {
      res.status(404).json({ error: 'Person or movies not found' });
      return;
    }
    
    res.json(result._items);
  } catch (error) {
    console.error('Error fetching person movies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/movies/:id/recommendations', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = '10' } = req.query;
    
    const result = await client.submit(
      'g.V().has("movie", "id", movieId)' +
      '.outE("appears_in").inV()' +  // Get actors
      '.inE("appears_in").outV()' +  // Get their movies
      '.where(neq("movie"))' +       // Exclude original movie
      '.groupCount()' +              // Count common actors
      '.order(local)' +              // Sort by count
      '.by(values, desc)' +
      '.limit(local, limit)' +
      '.unfold()' +
      '.project("id", "label", "properties", "commonActors")' +
      '.by(select(keys).id())' +
      '.by(select(keys).label())' +
      '.by(select(keys).valueMap())' +
      '.by(select(values))',
      {
        movieId: id,
        limit: parseInt(limit as string),
      }
    );
    
    if (!result._items || result._items.length === 0) {
      res.status(404).json({ error: 'Movie not found or no recommendations available' });
      return;
    }
    
    res.json(result._items);
  } catch (error) {
    console.error('Error fetching movie recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
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
  await client.close();
  process.exit(0);
});

// Create serverless handler
export const handler: APIGatewayProxyHandler = serverless({ app });
