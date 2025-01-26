# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY services/graph-api/package.json ./services/graph-api/

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy source code
COPY services/graph-api ./services/graph-api
COPY shared ./shared

# Build the application
RUN pnpm --filter @movie-graph/graph-api build

# Production stage
FROM node:20-alpine

# Install Lambda Runtime Interface Client
RUN npm install aws-lambda-ric

# Set working directory
WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/services/graph-api/dist ./dist
COPY --from=builder /app/services/graph-api/node_modules ./node_modules
COPY --from=builder /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production
ENV AWS_LAMBDA_RUNTIME_API=3.2

# Use Lambda Runtime Interface Client as entrypoint
ENTRYPOINT ["/usr/local/bin/npx", "aws-lambda-ric"]
CMD ["dist/index.handler"] 