// Movie types
export interface Movie {
  id: string;
  titleType: string;
  primaryTitle: string;
  originalTitle: string;
  startYear: number | null;
  endYear: number | null;
  runtimeMinutes: number | null;
  genres: string[];
}

// Person types
export interface Person {
  id: string;
  primaryName: string;
  birthYear: number | null;
  deathYear: number | null;
  primaryProfession: string[];
  knownForTitles: string[];
}

// Graph types
export interface Vertex {
  id: string;
  label: 'movie' | 'person';
  properties: Movie | Person;
}

export interface Edge {
  id: string;
  label: 'appears_in';
  from: string;
  to: string;
  properties?: Record<string, unknown>;
}

// Metadata types
export interface MovieMetadata {
  id: string;  // tconst
  titleType: string;
  primaryTitle: string;
  originalTitle: string;
  startYear: number | null;
  endYear: number | null;
  runtimeMinutes: number | null;
  genres: string[];
}

export interface PersonMetadata {
  id: string;  // nconst
  primaryName: string;
  birthYear: number | null;
  deathYear: number | null;
  primaryProfession: string[];
  knownForTitles: string[];
}

// API Response types
export interface GraphResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
} 