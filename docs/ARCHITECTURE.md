# Movie Graph Architecture

## System Overview
Movie Graph is a cloud-native application that combines graph and relational databases to provide rich movie data exploration capabilities. The system is built using a serverless architecture to optimize costs and scalability.

## Infrastructure Components

### Database Layer
1. **Neptune Graph Database** (~$85/month)
   - Instance: db.t3.medium (smallest available)
   - Purpose: Store and query movie relationship data
   - Key Features:
     - Graph traversal queries
     - Gremlin query language support
     - Highly available across AZs

2. **RDS PostgreSQL** (~$12.50/month)
   - Instance: t4g.micro (ARM-based)
   - Purpose: Store movie metadata and attributes
   - Storage: GP2 ($0.115/GB/month)
   - Key Features:
     - Full-text search capabilities
     - Structured metadata queries
     - Cost-effective for relational data

### Compute Layer (Serverless)
1. **Lambda Functions**
   - Metadata API (Node.js)
     - Memory: 1024MB
     - Timeout: 30 seconds
     - Container-based deployment
     - Cost: Pay per request (~$0.20/million invocations + compute time)
   
   - Graph API (Node.js)
     - Memory: 1024MB
     - Timeout: 30 seconds
     - Container-based deployment
     - Cost: Pay per request (~$0.20/million invocations + compute time)

2. **API Gateway**
   - REST API with proxy integrations
   - CORS enabled for frontend access
   - Cost: ~$3.50/million requests

### Networking
1. **VPC Configuration**
   - Public subnets: API Gateway endpoints
   - Private subnets: Lambda functions
   - Isolated subnets: Databases
   - NAT Gateway: For Lambda internet access (~$32/month)

### Container Registry
1. **ECR Repositories**
   - Store Lambda container images
   - Versioned deployments
   - Minimal storage costs (~$0.10/GB/month)

## Cost Analysis

### Base Infrastructure Costs (Monthly)
- Neptune: $85
- RDS: $12.50
- NAT Gateway: $32
- Total Base: ~$129.50

### Variable Costs (Per Million Requests)
- Lambda Invocations: $0.20
- Lambda Compute: ~$0.50-$2.00 (depends on duration)
- API Gateway: $3.50
- Data Transfer: ~$0.09/GB
- Total Variable: ~$4.29-$5.79 per million requests

### Cost Optimization
1. **Serverless Benefits**
   - No idle compute costs
   - Auto-scaling from zero
   - Pay only for actual usage
   - Ideal for variable/low traffic

2. **Trade-offs**
   - Cold starts (mitigated by provisioned concurrency if needed)
   - API Gateway costs at high scale
   - Lambda duration limits (30s)

## Development Workflow
1. Local Development
   - Docker Compose for local databases
   - Local Lambda debugging
   - Hot reload for faster development

2. Deployment
   - AWS CDK for infrastructure
   - Container-based Lambda deployments
   - Automated via CI/CD

## Security
1. **Network Security**
   - VPC isolation
   - Security groups for service access
   - Private subnets for compute

2. **Authentication & Authorization**
   - API Gateway authentication (to be implemented)
   - IAM roles for Lambda functions
   - Secrets Manager for credentials

## Monitoring & Observability
1. **Metrics**
   - Lambda execution metrics
   - API Gateway request metrics
   - Database performance metrics

2. **Logging**
   - CloudWatch Logs
   - Lambda function logs
   - API Gateway access logs

## Future Considerations
1. **Scaling**
   - Provisioned concurrency for high-traffic endpoints
   - RDS vertical scaling if needed
   - API Gateway caching

2. **Features**
   - GraphQL API layer
   - Caching layer (ElastiCache/DAX)
   - Full-text search (OpenSearch)

3. **Cost Optimization**
   - Request batching
   - Response caching
   - Cold start optimization

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