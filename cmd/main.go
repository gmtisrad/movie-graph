package main

import (
	"fmt"
	"movie-graph/internal/graph"
	"movie-graph/internal/importer"
)

func main() {
	// movieGraph, err := graph.ImportGraph("./export")
	// if err != nil {
	// 	fmt.Println("Error importing graph:", err)
	// 	return
	// }
	movieGraph := importer.GenerateGraph()

	graph.ExportGraph(movieGraph, "./export")

	if movieGraph != nil {
		fmt.Println("Graph created successfully")
		// fmt.Printf("Index: %v\n", graph.Index)
		// fmt.Printf("Edges: %v\n", graph.Edges)
	} else {
		fmt.Println("Graph creation failed")
	}
}
