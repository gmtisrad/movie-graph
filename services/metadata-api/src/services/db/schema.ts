import { z } from 'zod';

// Base schemas for database records
export const MovieSchema = z.object({
  id: z.string(),
  title_type: z.enum(['movie', 'tvSeries', 'tvEpisode', 'tvMiniSeries']),
  primary_title: z.string(),
  original_title: z.string(),
  is_adult: z.boolean(),
  start_year: z.number().nullable(),
  end_year: z.number().nullable(),
  runtime_minutes: z.number().nullable(),
  genres: z.array(z.string()),
  created_at: z.date(),
  updated_at: z.date()
});

export const PersonSchema = z.object({
  id: z.string(),
  primary_name: z.string(),
  birth_year: z.number().nullable(),
  death_year: z.number().nullable(),
  primary_professions: z.array(z.string()),
  known_for_titles: z.array(z.string()),
  created_at: z.date(),
  updated_at: z.date()
});

export const MovieCrewSchema = z.object({
  movie_id: z.string(),
  director_ids: z.array(z.string()),
  writer_ids: z.array(z.string()),
  created_at: z.date()
});

export const MoviePrincipalSchema = z.object({
  movie_id: z.string(),
  person_id: z.string(),
  ordering: z.number(),
  category: z.string(),
  job: z.string().nullable(),
  characters: z.array(z.string()).nullable(),
  created_at: z.date()
});

// Types inferred from schemas
export type Movie = z.infer<typeof MovieSchema>;
export type Person = z.infer<typeof PersonSchema>;
export type MovieCrew = z.infer<typeof MovieCrewSchema>;
export type MoviePrincipal = z.infer<typeof MoviePrincipalSchema>;

// Search parameter schemas
export const MovieSearchParamsSchema = z.object({
  query: z.string().optional(),
  type: z.enum(['movie', 'tvSeries', 'tvEpisode', 'tvMiniSeries']).optional(),
  year: z.number().optional(),
  genre: z.string().optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0)
});

export const PersonSearchParamsSchema = z.object({
  query: z.string().optional(),
  profession: z.string().optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0)
});

export type MovieSearchParams = z.infer<typeof MovieSearchParamsSchema>;
export type PersonSearchParams = z.infer<typeof PersonSearchParamsSchema>; 