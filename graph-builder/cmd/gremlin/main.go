package main

import (
	"log"
	"movie-graph/internal/gremlin"
	"movie-graph/internal/importer"
)

func main() {
	// Generate the graph
	log.Println("Generating graph...")
	graph := importer.GenerateGraph()

	// Convert to Gremlin format
	log.Println("Converting to Gremlin format...")
	if err := gremlin.ConvertToGremlin(graph, "./data/gremlin"); err != nil {
		log.Fatalf("Failed to convert to Gremlin format: %v", err)
	}

	log.Println("Conversion complete! Files are in ./data/gremlin/")
} 