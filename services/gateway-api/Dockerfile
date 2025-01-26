# Build stage
FROM node:20-alpine as builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy workspace config and package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/types/package.json ./shared/types/
COPY services/gateway-api/package.json ./services/gateway-api/

# Install dependencies
RUN pnpm install

# Copy source code
COPY shared/types ./shared/types
COPY services/gateway-api ./services/gateway-api

# Build packages
RUN pnpm --filter @movie-graph/types build
RUN pnpm --filter @movie-graph/gateway-api build

# Development stage
FROM node:20-alpine as development

WORKDIR /app

# Copy workspace config and package files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/shared/types/package.json ./shared/types/
COPY --from=builder /app/services/gateway-api/package.json ./services/gateway-api/

# Install dependencies including devDependencies
RUN npm install -g pnpm && pnpm install

# Copy source code and built files
COPY --from=builder /app/shared/types ./shared/types
COPY --from=builder /app/services/gateway-api ./services/gateway-api

# Start development server
CMD ["pnpm", "--filter", "@movie-graph/gateway-api", "dev"]

# Production stage
FROM node:20-alpine as production

WORKDIR /app

# Copy workspace config and package files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/shared/types/package.json ./shared/types/
COPY --from=builder /app/services/gateway-api/package.json ./services/gateway-api/

# Install production dependencies only
RUN npm install -g pnpm && pnpm install --prod

# Copy built files
COPY --from=builder /app/shared/types/dist ./shared/types/dist
COPY --from=builder /app/services/gateway-api/dist ./services/gateway-api/dist

# Start production server
CMD ["node", "services/gateway-api/dist/index.js"] 