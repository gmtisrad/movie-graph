-- Create extension for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Movies table
CREATE TABLE IF NOT EXISTS movies (
    id VARCHAR(10) PRIMARY KEY,
    title_type VARCHAR(50) NOT NULL,
    primary_title TEXT NOT NULL,
    original_title TEXT NOT NULL,
    is_adult BOOLEAN NOT NULL,
    start_year INTEGER,
    end_year INTEGER,
    runtime_minutes INTEGER,
    genres TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- People table
CREATE TABLE IF NOT EXISTS people (
    id VARCHAR(10) PRIMARY KEY,
    primary_name TEXT NOT NULL,
    birth_year INTEGER,
    death_year INTEGER,
    primary_professions TEXT[],
    known_for_titles TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Movie Crew table
CREATE TABLE IF NOT EXISTS movie_crew (
    movie_id VARCHAR(10) PRIMARY KEY REFERENCES movies(id) ON DELETE CASCADE,
    director_ids TEXT[],
    writer_ids TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Movie Principals table
CREATE TABLE IF NOT EXISTS movie_principals (
    movie_id VARCHAR(10) REFERENCES movies(id) ON DELETE CASCADE,
    person_id VARCHAR(10) REFERENCES people(id) ON DELETE CASCADE,
    ordering INTEGER NOT NULL,
    category VARCHAR(50) NOT NULL,
    job TEXT,
    characters TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (movie_id, person_id, ordering)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_movies_primary_title ON movies USING gin (primary_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_movies_original_title ON movies USING gin (original_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_movies_title_type ON movies(title_type);
CREATE INDEX IF NOT EXISTS idx_movies_start_year ON movies(start_year);
CREATE INDEX IF NOT EXISTS idx_movies_genres ON movies USING gin(genres);

CREATE INDEX IF NOT EXISTS idx_people_primary_name ON people USING gin (primary_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_people_professions ON people USING gin(primary_professions);
CREATE INDEX IF NOT EXISTS idx_people_known_titles ON people USING gin(known_for_titles);

CREATE INDEX IF NOT EXISTS idx_movie_crew_director_ids ON movie_crew USING gin(director_ids);
CREATE INDEX IF NOT EXISTS idx_movie_crew_writer_ids ON movie_crew USING gin(writer_ids);

CREATE INDEX IF NOT EXISTS idx_movie_principals_person ON movie_principals(person_id);
CREATE INDEX IF NOT EXISTS idx_movie_principals_category ON movie_principals(category); 