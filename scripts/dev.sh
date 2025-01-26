#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required commands
if ! command_exists docker; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Function to wait for service health
wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1

    echo "Waiting for $service to be healthy..."
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps "$service" | grep -q "healthy"; then
            echo "$service is healthy!"
            return 0
        fi
        echo "Attempt $attempt/$max_attempts: $service is not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "Timeout waiting for $service to be healthy"
    return 1
}

# Start services
echo "Starting services..."
docker-compose up -d

# Wait for databases to be ready
wait_for_service postgres || exit 1
wait_for_service neptune || exit 1

# Run database migrations
echo "Running database migrations..."
docker-compose exec metadata-api pnpm migrate

# Check if data directory is provided
if [ -n "$1" ]; then
    DATA_DIR=$1
    echo "Loading data from $DATA_DIR..."
    
    # Run the Go data loader for metadata
    echo "Loading metadata..."
    cd services/metadata-api
    go run cmd/loader/main.go -data "$DATA_DIR"
    cd ../..

    # Run the graph builder
    echo "Loading graph data..."
    cd services/graph-builder
    go run main.go -data "$DATA_DIR"
    cd ../..
fi

echo "Development environment is ready!"
echo "Services:"
echo "  - Metadata API: http://localhost:3001"
echo "  - Graph API: http://localhost:3002"
echo "  - PostgreSQL: localhost:5432"
echo "  - Neptune: localhost:8182" 