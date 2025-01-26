# Metadata Service Architecture

## Overview

The metadata service provides detailed information about movies and people in our movie graph database. It's designed as a serverless application using AWS Aurora Serverless v2 for flexible scaling and cost optimization.

## System Design

### Infrastructure Stack
```
Client -> API Gateway -> Lambda -> RDS
```

### Database Schema

```sql
-- Movies table
CREATE TABLE movies (
    id VARCHAR(10) PRIMARY KEY,  -- tconst
    title_type VARCHAR(50),
    primary_title TEXT,
    original_title TEXT,
    is_adult BOOLEAN,
    start_year INTEGER,
    end_year INTEGER,
    runtime_minutes INTEGER,
    genres TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- People table
CREATE TABLE people (
    id VARCHAR(10) PRIMARY KEY,  -- nconst
    primary_name TEXT,
    birth_year INTEGER,
    death_year INTEGER,
    primary_professions TEXT[],
    known_for_titles TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Movie Crew table
CREATE TABLE movie_crew (
    movie_id VARCHAR(10) REFERENCES movies(id),
    director_ids TEXT[],
    writer_ids TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (movie_id)
);

-- Movie Principals table
CREATE TABLE movie_principals (
    movie_id VARCHAR(10) REFERENCES movies(id),
    person_id VARCHAR(10) REFERENCES people(id),
    ordering INTEGER,
    category VARCHAR(50),
    job TEXT,
    characters TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (movie_id, person_id, ordering)
);

-- Indexes
CREATE INDEX idx_movies_title ON movies(primary_title);
CREATE INDEX idx_people_name ON people(primary_name);
CREATE INDEX idx_movies_year ON movies(start_year);
CREATE INDEX idx_movies_type ON movies(title_type);
```

### API Endpoints

#### Movies
```typescript
// Search
GET /api/v1/movies/search
Query Parameters:
  - query: string       // Search in titles
  - type: string       // Filter by title type
  - year: number       // Filter by year
  - genre: string      // Filter by genre
  - limit: number      // Results per page (default: 10)
  - offset: number     // Pagination offset

// Direct lookup
GET /api/v1/movies/:id
Response: MovieMetadata

// Crew information
GET /api/v1/movies/:id/crew
Response: {
  directors: Person[];
  writers: Person[];
}

// Cast information
GET /api/v1/movies/:id/cast
Query Parameters:
  - role: string       // Filter by role (actor, director, etc.)
Response: {
  cast: Array<{
    person: Person;
    role: string;
    characters?: string[];
  }>;
}
```

#### People
```typescript
// Search
GET /api/v1/people/search
Query Parameters:
  - query: string       // Search in names
  - profession: string  // Filter by profession
  - limit: number      // Results per page (default: 10)
  - offset: number     // Pagination offset

// Direct lookup
GET /api/v1/people/:id
Response: PersonMetadata

// Movie appearances
GET /api/v1/people/:id/movies
Query Parameters:
  - role: string       // Filter by role
Response: {
  movies: Array<{
    movie: MovieMetadata;
    role: string;
    characters?: string[];
  }>;
}
```

## Implementation Details

### AWS Infrastructure (CDK)

```typescript
const stack = new Stack(app, 'MovieMetadataStack', {
  env: {
    region: 'us-west-2',
  },
});

// VPC
const vpc = new ec2.Vpc(stack, 'MetadataVPC', {
  maxAzs: 2,
  natGateways: 1,
});

// Database
const cluster = new rds.ServerlessCluster(stack, 'MetadataDB', {
  engine: rds.DatabaseClusterEngine.auroraPostgres({
    version: rds.AuroraPostgresEngineVersion.VER_14_5,
  }),
  scaling: {
    minCapacity: rds.AuroraCapacityUnit.ACU_2,
    maxCapacity: rds.AuroraCapacityUnit.ACU_16,
    autoPause: Duration.minutes(10),
  },
  defaultDatabaseName: 'moviemetadata',
  vpc,
});

// API Gateway
const api = new apigateway.RestApi(stack, 'MetadataApi');

// Lambda Function
const handler = new lambda.Function(stack, 'MetadataHandler', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda'),
  environment: {
    DATABASE_SECRET_ARN: cluster.secret?.secretArn || '',
    DATABASE_NAME: 'moviemetadata',
  },
});
```

### Data Loading

1. **Initial Load**:
   - Use AWS DMS for bulk data import
   - Transform TSV files to SQL during migration
   - Validate data integrity post-migration

2. **Updates**:
   - Lambda function for processing IMDb data updates
   - Batch processing for large updates
   - Maintain audit trail of changes

### Performance Considerations

1. **Database**:
   - Appropriate indexes for common queries
   - Connection pooling in Lambda
   - Query optimization for common patterns

2. **API**:
   - Response caching where appropriate
   - Pagination for large result sets
   - Efficient joins and data loading

3. **Scaling**:
   - Aurora Serverless auto-scaling
   - Lambda concurrency limits
   - API Gateway throttling

### Monitoring & Observability

1. **Metrics**:
   - Database performance metrics
   - API latency metrics
   - Error rates and types

2. **Logging**:
   - Structured logging in Lambda
   - Database query logging
   - API access logs

3. **Alerts**:
   - Error rate thresholds
   - Database capacity alerts
   - API latency alerts

## Development Workflow

1. **Local Development**:
   ```bash
   # Start local PostgreSQL
   docker-compose up -d

   # Run migrations
   pnpm migrate:up

   # Start development server
   pnpm dev
   ```

2. **Testing**:
   - Unit tests for business logic
   - Integration tests with test database
   - API endpoint tests

3. **Deployment**:
   ```bash
   # Deploy infrastructure
   pnpm cdk deploy

   # Run migrations
   pnpm migrate:deploy

   # Deploy API
   pnpm deploy
   ```

## Security

1. **Database**:
   - VPC isolation
   - IAM authentication
   - Encryption at rest
   - SSL connections

2. **API**:
   - API key authentication
   - Rate limiting
   - Input validation
   - CORS configuration

3. **Infrastructure**:
   - Least privilege IAM roles
   - Security group restrictions
   - Regular security updates

## Open Questions

1. **Data Synchronization**:
   - Frequency of IMDb data updates
   - Strategy for handling deletes
   - Conflict resolution

2. **Caching Strategy**:
   - Cache invalidation rules
   - Cache warming approach
   - Cache hit rate targets

3. **Cost Optimization**:
   - Connection pooling strategy
   - Auto-pause configuration
   - API request patterns 