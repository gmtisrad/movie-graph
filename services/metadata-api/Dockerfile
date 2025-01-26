# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY services/metadata-api/package.json ./services/metadata-api/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy source code
COPY services/metadata-api ./services/metadata-api
COPY shared ./shared

# Build the application
RUN cd services/metadata-api && pnpm build

# Development stage
FROM node:20-alpine as development

WORKDIR /app

# Copy package files and install dependencies
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/services/metadata-api/package.json ./services/metadata-api/
RUN npm install -g pnpm && pnpm install

# Copy source code
COPY --from=builder /app/services/metadata-api ./services/metadata-api
COPY --from=builder /app/shared ./shared

# Install development dependencies
RUN cd services/metadata-api && pnpm install

# Start development server
CMD ["pnpm", "--filter", "@movie-graph/metadata-api", "dev"]

# Production stage
FROM node:20-alpine as production

WORKDIR /app

# Copy package files and install production dependencies
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/services/metadata-api/package.json ./services/metadata-api/
RUN npm install -g pnpm && pnpm install --prod

# Copy built application
COPY --from=builder /app/services/metadata-api/dist ./services/metadata-api/dist
COPY --from=builder /app/shared ./shared

# Start production server
CMD ["node", "services/metadata-api/dist/index.js"] 