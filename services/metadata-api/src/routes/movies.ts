import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { DatabaseService } from '../services/db';
import { MovieSearchParamsSchema } from '../services/db/schema';
import { Movie, MovieCrew, MoviePrincipal } from '../services/db/schema';

interface SearchMoviesResponse {
  total: number;
  results: Movie[];
}

interface ErrorResponse {
  error: string;
  details?: unknown;
}

export function createMovieRouter(db: DatabaseService): Router {
  const router = Router();

  // Search movies
  router.get('/search', asyncHandler(async (req: Request, res: Response<SearchMoviesResponse | ErrorResponse>) => {
    const params = MovieSearchParamsSchema.parse(req.query);
    const results = await db.searchMovies(params);
    res.json(results);
  }));

  // Get movie by ID
  router.get('/:id', asyncHandler(async (req: Request, res: Response<Movie | ErrorResponse>) => {
    const movie = await db.getMovie(req.params.id);
    if (!movie) {
      res.status(404).json({ error: 'Movie not found' });
      return;
    }
    res.json(movie);
  }));

  // Get movie crew
  router.get('/:id/crew', asyncHandler(async (req: Request, res: Response<MovieCrew | ErrorResponse>) => {
    const crew = await db.getMovieCrew(req.params.id);
    if (!crew) {
      res.status(404).json({ error: 'Movie crew not found' });
      return;
    }
    res.json(crew);
  }));

  // Get movie cast
  router.get('/:id/cast', asyncHandler(async (req: Request, res: Response<MoviePrincipal[] | ErrorResponse>) => {
    const role = req.query.role as string | undefined;
    const cast = await db.getMovieCast(req.params.id, role);
    res.json(cast);
  }));

  return router;
} 