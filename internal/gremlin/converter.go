package gremlin

import (
	"encoding/csv"
	"fmt"
	"log"
	"movie-graph/internal/graph"
	"movie-graph/internal/models"
	"os"
)

type GremlinVertex struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

type GremlinEdge struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	From  string `json:"from"`
	To    string `json:"to"`
}

func ConvertToGremlin(g *graph.Graph, outputDir string) error {
	// Create output directory if it doesn't exist
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %v", err)
	}

	// Create vertex file
	vertexFile, err := os.Create(outputDir + "/vertices.csv")
	if err != nil {
		return fmt.Errorf("failed to create vertex file: %v", err)
	}
	defer vertexFile.Close()

	// Create edge file
	edgeFile, err := os.Create(outputDir + "/edges.csv")
	if err != nil {
		return fmt.Errorf("failed to create edge file: %v", err)
	}
	defer edgeFile.Close()

	// Setup CSV writers
	vertexWriter := csv.NewWriter(vertexFile)
	edgeWriter := csv.NewWriter(edgeFile)

	// Write headers
	if err := vertexWriter.Write([]string{"~id", "~label"}); err != nil {
		return fmt.Errorf("failed to write vertex header: %v", err)
	}

	if err := edgeWriter.Write([]string{"~id", "~from", "~to", "~label"}); err != nil {
		return fmt.Errorf("failed to write edge header: %v", err)
	}

	// Write vertices
	edgeID := 1
	for nodeID, node := range g.Index {
		// Determine label based on the type of Value
		label := "unknown"
		switch node.Value.(type) {
		case *models.Person:
			label = "person"
		case *models.Title:
			label = "movie"
		}

		if err := vertexWriter.Write([]string{nodeID, label}); err != nil {
			return fmt.Errorf("failed to write vertex: %v", err)
		}

		// Write edges for this vertex
		if edges, ok := g.Edges[nodeID]; ok {
			for _, toID := range edges {
				edgeRecord := []string{
					fmt.Sprintf("e%d", edgeID),
					nodeID,
					toID,
					"appears_in",
				}
				if err := edgeWriter.Write(edgeRecord); err != nil {
					return fmt.Errorf("failed to write edge: %v", err)
				}
				edgeID++
			}
		}
	}

	vertexWriter.Flush()
	edgeWriter.Flush()

	if err := vertexWriter.Error(); err != nil {
		return fmt.Errorf("error flushing vertex writer: %v", err)
	}

	if err := edgeWriter.Error(); err != nil {
		return fmt.Errorf("error flushing edge writer: %v", err)
	}

	log.Printf("Successfully converted graph to Gremlin format in %s", outputDir)
	return nil
} 