# IMDB Movie Graph Generator

A high-performance Go application that generates a graph database from IMDB's non-commercial datasets, creating connections between movies and the people who worked on them.

## Overview

This project creates a graph structure from IMDB's dataset files, establishing relationships between movies and their cast/crew members. It uses concurrent processing to efficiently handle large datasets and exports the results to CSV files for further analysis.

## Prerequisites

- Go 1.23.2 or higher
- At least 16GB RAM recommended
- Sufficient disk space for IMDB datasets and generated graph files

## Installation

1. Clone the repository:

2. Download required IMDB dataset files from https://developer.imdb.com/non-commercial-datasets/:
   - title.basics.tsv.gz
   - name.basics.tsv.gz
   - title.principals.tsv.gz

3. Extract the downloaded files into a `data` directory in the project root:
```bash
mkdir data
# Extract your downloaded files into the data directory
```

## Usage

1. Ensure all dataset files are extracted in the `data` directory
2. Run the graph generator:
```bash
go run ./cmd/main.go
```

The program will:
- Create indexes of movies and people from the datasets
- Generate a graph structure connecting related entities
- Export the results to CSV files in the `export` directory

## Project Structure

- `cmd/main.go` - Entry point of the application
- `internal/`
  - `graph/` - Graph data structure implementation
  - `importer/` - Dataset processing and graph generation
  - `models/` - Data models for movies and people
- `data/` - Directory for IMDB dataset files (not included in repo)
- `export/` - Output directory for generated graph files

## Performance

The application uses several optimization techniques:
- Concurrent processing with worker pools
- Efficient indexing of movies and people
- Memory-optimized data structures
- Mutex-protected concurrent access to shared resources

## Output Format

The generator creates two CSV files in the `export` directory:

### Index.csv
Contains all vertices (movies and people) with their properties:
```
ID, Value
<string>, <serialized JSON>
```

### Edges.csv
Contains all relationships between vertices:
```
ID, Edges
<string>, <connected node ID>
```

## License

This project currently has no license.

## Acknowledgments

- IMDB for providing the non-commercial datasets

## Note

This project is for educational and non-commercial use only, in accordance with IMDB's dataset terms of use.

## Running the React Frontend

The project includes a React frontend for visualizing the graph data. To run it locally:

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- OMDB API key (for movie search functionality)

### Installation (Mac/Linux)
```bash
# Navigate to the app directory
cd app

# Install dependencies using pnpm
pnpm install

# Create a .env file for your OMDB API key
# If you don't have one, it's fine. Search just won't work. Get imdb IDs from the url of the imdb website
echo "VITE_OMDB_API_KEY=your_api_key_here" > .env

# Start the development server
pnpm dev
```

### Installation (Windows)
```bash
# Navigate to the app directory
cd app

# Install dependencies using pnpm
pnpm install

# Create a .env file for your OMDB API key
echo VITE_OMDB_API_KEY=your_api_key_here > .env

# Start the development server
pnpm dev
```

The React app will be available at `http://localhost:5173` by default.

### Features
- Interactive 3D graph visualization
- Movie and actor search functionality
- Customizable graph appearance
- Keyboard controls for navigation (W,A,S,D)
- Dark/Light mode support