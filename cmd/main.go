package main

import (
	"log"
	"movie-graph/internal/graph"
	"movie-graph/internal/importer"
	"os"
)

func main() {
	// Set up logging to a file
	logFile, err := os.OpenFile("app.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Printf("Error opening log file: %v\n", err)
		return
	}
	defer logFile.Close()
	log.SetOutput(logFile)

	movieGraph := importer.GenerateGraph()

	graph.ExportGraph(movieGraph, "./export")

	if movieGraph != nil {
		log.Println("Graph created successfully")
	} else {
		log.Println("Graph creation failed")
	}
}


// package main

// import (
// 	"log"
// 	"movie-graph/internal/graph"
// 	"movie-graph/internal/importer"
// )

// func main() {
// 	// movieGraph, err := graph.ImportGraph("./export")
// 	// if err != nil {	
// 	// 	log.Println("Error importing graph:", err)
// 	// 	return
// 	// }
// 	movieGraph := importer.GenerateGraph()

// 	graph.ExportGraph(movieGraph, "./export")

// 	if movieGraph != nil {
// 		log.Println("Graph created successfully")
// 		// log.Printf("Index: %v\n", graph.Index)
// 		// log.Printf("Edges: %v\n", graph.Edges)
// 	} else {
// 		log.Println("Graph creation failed")
// 	}
// }
