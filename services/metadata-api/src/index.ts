import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { DatabaseService } from './services/db';
import { createMovieRouter } from './routes/movies';
import { createPeopleRouter } from './routes/people';
import config from './config';

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(helmet());
app.use(morgan(config.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json());

// Create database service
const db = new DatabaseService(config.DATABASE_URL);

// Routes
app.use('/api/v1/movies', createMovieRouter(db));
app.use('/api/v1/people', createPeopleRouter(db));

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    ...(config.NODE_ENV === 'development' ? { details: err.message } : {})
  });
});

// Start server
app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
}); 