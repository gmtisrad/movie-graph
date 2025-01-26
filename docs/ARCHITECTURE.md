# Movie Graph Architecture

## Cost Analysis & Service Split Rationale

### Database Costs (us-west-2)

1. **Graph Service (Neptune)**:
   - Smallest instance (db.t3.medium): ~$85/month
   - Serverless, pay as you go. minimum 0?
   - Required for graph operations
   - No zero-cost idle state
   - Optimized for graph traversals and relationships

2. **Metadata Service (RDS t4g.micro)**:
   - Instance cost: ~$12.50/month
   - Storage: $0.115/GB/month (gp2)
   - Sufficient for metadata operations
   - ARM-based for cost efficiency
   - Burstable performance with CPU credits

### Architecture Decision
We've split the services based on both functionality and cost optimization:
- **Graph Service**: Uses Neptune for relationship-heavy queries where graph traversal is essential
- **Metadata Service**: Uses RDS for traditional relational queries where we just need fast lookups and joins
- **Cost Efficiency**: ~$97.50/month base cost vs ~$170/month if using Neptune for everything
- **Performance**: Each database is optimized for its specific query patterns

## Repository Structure

```
movie-graph/
├── services/
│   ├── graph-api/          # Graph traversal service
│   └── metadata-api/       # Movie/Person metadata service
├── shared/
│   ├── types/             # Shared TypeScript types
│   └── utils/             # Shared utilities
├── app/                   # Frontend application
├── infrastructure/        # AWS/Infrastructure code
└── docs/                 # Documentation
```

## System Overview

The Movie Graph system is a graph-based movie and person relationship explorer, built with a microservices architecture. The system allows users to explore relationships between movies and people (actors, directors, etc.) through a graph-based API.

## Core Services

### 1. Graph Service (Neptune/Gremlin)
- **Purpose**: Store and query relationship data between movies and people
- **Technology**: Amazon Neptune with Gremlin
- **Package**: `@movie-graph/graph-api`
- **Data Model**:
  ```typescript
  Vertex {
    id: string;        // tconst/nconst
    label: 'movie' | 'person';
  }

  Edge {
    id: string;
    from: string;     // vertex id
    to: string;       // vertex id
    label: 'appears_in';
  }
  ```
- **Responsibilities**:
  - Graph traversal operations
  - Relationship queries
  - Basic vertex/edge CRUD

### 2. Metadata Service
- **Purpose**: Store and serve detailed entity information
- **Technology**: PostgreSQL
- **Package**: `@movie-graph/metadata-api`
- **Data Model**:
  ```typescript
  MovieMetadata {
    id: string;           // tconst
    titleType: string;
    primaryTitle: string;
    originalTitle: string;
    startYear: number | null;
    endYear: number | null;
    runtimeMinutes: number | null;
    genres: string[];
  }

  PersonMetadata {
    id: string;           // nconst
    primaryName: string;
    birthYear: number | null;
    deathYear: number | null;
    primaryProfession: string[];
    knownForTitles: string[];
  }
  ```
- **Responsibilities**:
  - CRUD operations for movie/person metadata
  - Search functionality
  - Data enrichment

### 3. Frontend Application
- **Purpose**: User interface for exploring the movie graph
- **Technology**: React
- **Package**: `@movie-graph/app`
- **Responsibilities**:
  - Visual graph exploration
  - Search interface
  - Movie/Person details display

## Development

### Package Management
- Using pnpm workspaces for monorepo management
- Shared dependencies are hoisted to the root
- Workspace packages are referenced using `workspace:*`

### Local Development
1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start all services:
   ```bash
   pnpm dev
   ```

3. Build all packages:
   ```bash
   pnpm build
   ```

## Data Flow

1. **Graph Queries**:
   ```
   Client -> Frontend -> Graph API -> Neptune -> Graph API -> Frontend -> Client
   ```

2. **Enriched Queries**:
   ```
   Client -> Frontend -> [Graph API + Metadata API] -> Frontend -> Client
   ```

## Future Considerations

1. **Caching Strategy**:
   - Consider Redis for frequently accessed metadata
   - Cache common graph traversal patterns
   - Implement response caching at API gateway

2. **Scaling**:
   - Neptune read replicas for read scaling
   - Metadata service horizontal scaling
   - API gateway load balancing

3. **Data Updates**:
   - Batch update process for new IMDb data
   - Real-time updates for user-generated content
   - Consistency between graph and metadata

4. **Monitoring & Observability**:
   - Graph query performance metrics
   - API response times
   - Error rates and patterns
   - Resource utilization

## Security

1. **API Security**:
   - Rate limiting
   - API key authentication
   - Request validation
   - Input sanitization

2. **Data Security**:
   - Neptune VPC configuration
   - IAM roles and policies
   - Encryption at rest
   - Secure communication between services

## Open Questions

1. **Metadata Storage**:
   - Schema optimization
   - Indexing strategy
   - Update frequency

2. **Caching Strategy**:
   - Cache invalidation rules
   - Cache warming strategy
   - Memory allocation

3. **Search Implementation**:
   - Full-text search requirements
   - Search result ranking
   - Search performance optimization

4. **Scale Considerations**:
   - Expected query patterns
   - Data growth projections
   - Performance requirements
   - Cost optimization