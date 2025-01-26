# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY services/graph-api/package.json ./services/graph-api/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy source code
COPY services/graph-api ./services/graph-api
COPY shared ./shared

# Build the application
RUN cd services/graph-api && pnpm build

# Development stage
FROM node:20-alpine as development

WORKDIR /app

# Copy package files and install dependencies
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/services/graph-api/package.json ./services/graph-api/
RUN npm install -g pnpm && pnpm install

# Copy source code
COPY --from=builder /app/services/graph-api ./services/graph-api
COPY --from=builder /app/shared ./shared

# Install development dependencies
RUN cd services/graph-api && pnpm install

# Start development server
CMD ["pnpm", "--filter", "@movie-graph/graph-api", "dev"]

# Production stage
FROM node:20-alpine as production

WORKDIR /app

# Copy package files and install production dependencies
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/services/graph-api/package.json ./services/graph-api/
RUN npm install -g pnpm && pnpm install --prod

# Copy built application
COPY --from=builder /app/services/graph-api/dist ./services/graph-api/dist
COPY --from=builder /app/shared ./shared

# Start production server
CMD ["node", "services/graph-api/dist/index.js"] 