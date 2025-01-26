import { Router } from 'express';
import { z } from 'zod';
import { Vertex, Edge, PaginatedResponse, ErrorResponse } from '@movie-graph/types';
import { GraphClient } from '../services/graph/client';
import asyncHandler from 'express-async-handler';

const router = Router();
const client = new GraphClient(process.env.GREMLIN_ENDPOINT || 'ws://localhost:8182/gremlin');

// Input validation schemas
const DirectionSchema = z.enum(['in', 'out', 'both']).default('both');
const LabelSchema = z.enum(['movie', 'person']).optional();
const PaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0)
});

// Get vertex by ID
router.get<{ id: string }, Vertex | ErrorResponse>('/vertices/:id', async (req, res) => {
  try {
    const vertex = await client.getVertex(req.params.id);
    if (!vertex) {
      return res.status(404).json({ error: 'Vertex not found' });
    }
    res.json(vertex);
  } catch (error) {
    console.error('Error in /vertices/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get edges for a vertex
router.get<{ id: string }, Edge[] | ErrorResponse>(
  '/vertices/:id/edges', 
  async (req, res) => {
    try {
      const direction = DirectionSchema.parse(req.query.direction);
      const edges = await client.getConnectedEdges(req.params.id, direction);
      res.json(edges);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors 
        });
      }
      console.error('Error in /vertices/:id/edges:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get neighboring vertices
router.get<{ id: string }, Vertex[] | ErrorResponse>(
  '/vertices/:id/neighbors', 
  async (req, res) => {
    try {
      const direction = DirectionSchema.parse(req.query.direction);
      const label = LabelSchema.parse(req.query.label);
      const neighbors = await client.getConnectedVertices(req.params.id, direction, label);
      res.json(neighbors);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors 
        });
      }
      console.error('Error in /vertices/:id/neighbors:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Search vertices
router.get<{}, PaginatedResponse<Vertex> | ErrorResponse>(
  '/search', 
  async (req, res) => {
    try {
      const label = LabelSchema.parse(req.query.label);
      if (!label) {
        return res.status(400).json({ 
          error: 'Label parameter is required',
          code: 'MISSING_PARAMETER' 
        });
      }

      const { limit, offset } = PaginationSchema.parse(req.query);
      const results = await client.getVerticesByLabel(label, limit, offset);
      res.json(results);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors 
        });
      }
      console.error('Error in /search:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Movie cast endpoint
router.get('/movies/:id/cast', asyncHandler(async (req, res) => {
  const { id } = z.object({
    id: z.string(),
  }).parse(req.params);
  const { limit, offset } = z.object({
    limit: z.string().optional().transform(val => parseInt(val || '10')),
    offset: z.string().optional().transform(val => parseInt(val || '0')),
  }).parse(req.query);

  try {
    const result = await client.getMovieCast(id, limit, offset);
    res.json(result);
  } catch (error) {
    const response: ErrorResponse = {
      error: 'Failed to fetch movie cast',
      details: error instanceof Error ? error.message : undefined
    };
    res.status(500).json(response);
  }
}));

// Person movies endpoint
router.get('/people/:id/movies', asyncHandler(async (req, res) => {
  const { id } = z.object({
    id: z.string(),
  }).parse(req.params);
  const { limit, offset } = z.object({
    limit: z.string().optional().transform(val => parseInt(val || '10')),
    offset: z.string().optional().transform(val => parseInt(val || '0')),
  }).parse(req.query);

  try {
    const result = await client.getPersonMovies(id, limit, offset);
    res.json(result);
  } catch (error) {
    const response: ErrorResponse = {
      error: 'Failed to fetch person movies',
      details: error instanceof Error ? error.message : undefined
    };
    res.status(500).json(response);
  }
}));

// Movie recommendations endpoint
router.get('/movies/:id/recommendations', asyncHandler(async (req, res) => {
  const { id } = z.object({
    id: z.string(),
  }).parse(req.params);
  const { limit } = z.object({
    limit: z.string().optional().transform(val => parseInt(val || '10')),
  }).parse(req.query);

  try {
    const result = await client.getMovieRecommendations(id, limit);
    res.json(result);
  } catch (error) {
    const response: ErrorResponse = {
      error: 'Failed to fetch movie recommendations',
      details: error instanceof Error ? error.message : undefined
    };
    res.status(500).json(response);
  }
}));

export default router; 