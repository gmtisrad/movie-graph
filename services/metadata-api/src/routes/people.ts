import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { DatabaseService } from '../services/db';
import { PersonSearchParamsSchema } from '../services/db/schema';
import { Person } from '../services/db/schema';

interface SearchPeopleResponse {
  total: number;
  results: Person[];
}

interface ErrorResponse {
  error: string;
  details?: unknown;
}

export function createPeopleRouter(db: DatabaseService): Router {
  const router = Router();

  // Search people
  router.get('/search', asyncHandler(async (req: Request, res: Response<SearchPeopleResponse | ErrorResponse>) => {
    const params = PersonSearchParamsSchema.parse(req.query);
    const results = await db.searchPeople(params);
    res.json(results);
  }));

  // Get person by ID
  router.get('/:id', asyncHandler(async (req: Request, res: Response<Person | ErrorResponse>) => {
    const person = await db.getPerson(req.params.id);
    if (!person) {
      res.status(404).json({ error: 'Person not found' });
      return;
    }
    res.json(person);
  }));

  return router;
} 