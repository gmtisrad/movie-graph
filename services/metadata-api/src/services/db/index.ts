import pgPromise from 'pg-promise';
import { Movie, Person, MovieCrew, MoviePrincipal, MovieSearchParams, PersonSearchParams } from './schema';

const pgp = pgPromise();

export class DatabaseService {
  private db: ReturnType<typeof pgp>;

  constructor(connectionString: string) {
    this.db = pgp(connectionString);
  }

  // Movies
  async getMovie(id: string): Promise<Movie | null> {
    return this.db.oneOrNone<Movie>(
      'SELECT * FROM movies WHERE id = $1',
      [id]
    );
  }

  async searchMovies(params: MovieSearchParams): Promise<{ total: number; results: Movie[] }> {
    const conditions = [];
    const values = [];
    let valueIndex = 1;

    if (params.query) {
      conditions.push(`(primary_title ILIKE $${valueIndex} OR original_title ILIKE $${valueIndex})`);
      values.push(`%${params.query}%`);
      valueIndex++;
    }

    if (params.type) {
      conditions.push(`title_type = $${valueIndex}`);
      values.push(params.type);
      valueIndex++;
    }

    if (params.year) {
      conditions.push(`start_year = $${valueIndex}`);
      values.push(params.year);
      valueIndex++;
    }

    if (params.genre) {
      conditions.push(`$${valueIndex} = ANY(genres)`);
      values.push(params.genre);
      valueIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const [{ total }, results] = await Promise.all([
      this.db.one(
        `SELECT COUNT(*) as total FROM movies ${whereClause}`,
        values
      ),
      this.db.manyOrNone<Movie>(
        `SELECT * FROM movies ${whereClause} 
         ORDER BY primary_title 
         LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`,
        [...values, params.limit, params.offset]
      )
    ]);

    return {
      total: parseInt(total as unknown as string),
      results
    };
  }

  // Movie Crew
  async getMovieCrew(movieId: string): Promise<MovieCrew | null> {
    return this.db.oneOrNone<MovieCrew>(
      'SELECT * FROM movie_crew WHERE movie_id = $1',
      [movieId]
    );
  }

  async getMovieCast(movieId: string, role?: string): Promise<MoviePrincipal[]> {
    const query = role
      ? 'SELECT * FROM movie_principals WHERE movie_id = $1 AND category = $2 ORDER BY ordering'
      : 'SELECT * FROM movie_principals WHERE movie_id = $1 ORDER BY ordering';
    
    const params = role ? [movieId, role] : [movieId];
    
    return this.db.manyOrNone<MoviePrincipal>(query, params);
  }

  // People
  async getPerson(id: string): Promise<Person | null> {
    return this.db.oneOrNone<Person>(
      'SELECT * FROM people WHERE id = $1',
      [id]
    );
  }

  async searchPeople(params: PersonSearchParams): Promise<{ total: number; results: Person[] }> {
    const conditions = [];
    const values = [];
    let valueIndex = 1;

    if (params.query) {
      conditions.push(`primary_name ILIKE $${valueIndex}`);
      values.push(`%${params.query}%`);
      valueIndex++;
    }

    if (params.profession) {
      conditions.push(`$${valueIndex} = ANY(primary_professions)`);
      values.push(params.profession);
      valueIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const [{ total }, results] = await Promise.all([
      this.db.one(
        `SELECT COUNT(*) as total FROM people ${whereClause}`,
        values
      ),
      this.db.manyOrNone<Person>(
        `SELECT * FROM people ${whereClause} 
         ORDER BY primary_name 
         LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`,
        [...values, params.limit, params.offset]
      )
    ]);

    return {
      total: parseInt(total as unknown as string),
      results
    };
  }

  async close(): Promise<void> {
    await pgp.end();
  }
} 