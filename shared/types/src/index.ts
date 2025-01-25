// Graph types
export interface Vertex {
  id: string;
  label: 'movie' | 'person';
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  label: 'appears_in';
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
export interface PaginatedResponse<T> {
  total: number;
  results: T[];
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
} 