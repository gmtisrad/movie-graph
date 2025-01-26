#!/bin/bash

# Exit on error
set -e

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required commands
if ! command_exists docker; then
    echo "Error: docker is not installed"
    exit 1
fi

if ! command_exists docker-compose; then
    echo "Error: docker-compose is not installed"
    exit 1
fi

# Function to wait for service health
wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1

    echo "Waiting for $service to be healthy..."
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps $service | grep -q "healthy"; then
            echo "$service is healthy!"
            return 0
        fi
        echo "Attempt $attempt/$max_attempts: $service is not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "Error: $service failed to become healthy after $max_attempts attempts"
    exit 1
}

# Start services
echo "Starting services..."
docker-compose up -d

# Wait for databases to be ready
wait_for_service postgres
wait_for_service gremlin-server

# Run database migrations if needed
echo "Running database migrations..."
cd services/metadata-api && pnpm migrate

# If data directory is provided, load data
if [ -n "$1" ]; then
    echo "Loading data from $1..."
    cd ../graph-builder && go run cmd/loader/main.go -data "$1"
fi

# Show service URLs
echo "
Services are ready!
==================
Metadata API: http://localhost:3001
Graph API: http://localhost:3002
PostgreSQL: localhost:5432
Gremlin Server: ws://localhost:8182/gremlin
"

# Follow logs
docker-compose logs -f 