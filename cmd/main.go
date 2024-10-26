package main

import (
	"fmt"
	"movie-graph/internal/graph"
)

func main() {
	graph, err := graph.ImportGraph("./export")
	if err != nil {
		fmt.Println("Error importing graph:", err)
		return
	}
	// graph := importer.GenerateGraph()

	if graph != nil {
		fmt.Println("Graph created successfully")
		fmt.Printf("Index: %v\n", graph.Index)
		fmt.Printf("Edges: %v\n", graph.Edges)
	} else {
		fmt.Println("Graph creation failed")
	}
}
