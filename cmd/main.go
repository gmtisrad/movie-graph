package main

import (
	"bufio"
	"fmt"
	"log"
	"movie-graph/internal/graph"
	"movie-graph/internal/graph/search"
	"movie-graph/internal/importer"
	"os"
	"strings"
	"time"
)

func main() {
	// Set up logging
	setupLogging()

	var movieGraph *graph.Graph
	reader := bufio.NewReader(os.Stdin)

	for {
		fmt.Println("\n=== Movie Graph CLI ===")
		fmt.Println("1. Import existing graph")
		fmt.Println("2. Generate new graph")
		fmt.Println("3. Exit")
		fmt.Print("Choose an option: ")

		choice, _ := reader.ReadString('\n')
		choice = strings.TrimSpace(choice)

		switch choice {
		case "1":
			movieGraph = importExistingGraph(reader)
		case "2":
			movieGraph = generateNewGraph()
		case "3":
			fmt.Println("Goodbye!")
			return
		default:
			fmt.Println("Invalid option, please try again")
			continue
		}

		if movieGraph != nil {
			searchMenu(movieGraph, reader)
		}
	}
}

func setupLogging() {
	logFile, err := os.OpenFile("app.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Printf("Error opening log file: %v\n", err)
		return
	}
	log.SetOutput(logFile)
}

func importExistingGraph(reader *bufio.Reader) *graph.Graph {
	fmt.Print("Enter path to import files (default: ./export): ")
	path, _ := reader.ReadString('\n')
	path = strings.TrimSpace(path)
	if path == "" {
		path = "./export"
	}

	startTime := time.Now()
	movieGraph, err := graph.ImportGraph(path)
	if err != nil {
		log.Printf("Error importing graph: %v\n", err)
		return nil
	}

	elapsedTime := time.Since(startTime)
	log.Printf("Graph imported in %s\n", elapsedTime)
	return movieGraph
}

func generateNewGraph() *graph.Graph {
	movieGraph := importer.GenerateGraph()
	if movieGraph != nil {
		graph.ExportGraph(movieGraph, "./export")
		log.Println("Graph generated and exported successfully")
	}
	return movieGraph
}

func searchMenu(movieGraph *graph.Graph, reader *bufio.Reader) {
	var startNode, endNode *graph.Node

	// Get start node
	for startNode == nil {
		fmt.Print("Enter start node ID: ")
		startID, _ := reader.ReadString('\n')
		startID = strings.TrimSpace(startID)
		
		startNode = graph.GetNode(movieGraph, startID)
		if startNode == nil {
			fmt.Println("Start node not found. Please try again.")
		}
	}

	// Get end node
	for endNode == nil {
		fmt.Print("Enter end node ID: ")
		endID, _ := reader.ReadString('\n')
		endID = strings.TrimSpace(endID)

		endNode = graph.GetNode(movieGraph, endID)
		if endNode == nil {
			fmt.Println("End node not found. Please try again.")
		}
	}

	// Choose search algorithm
	fmt.Println("\nChoose search algorithm:")
	fmt.Println("1. Breadth-First Search (BFS)")
	fmt.Println("2. Depth-First Search (DFS)")
	fmt.Print("Enter choice: ")

	choice, _ := reader.ReadString('\n')
	choice = strings.TrimSpace(choice)

	switch choice {
	case "1":
		search.BFS(movieGraph, startNode, endNode)
	case "2":
		// Implement DFS functionality
	default:
		fmt.Println("Invalid option, please try again")
		return
	}

	if movieGraph != nil {
		log.Println("Graph created successfully")
		// log.Printf("Index: %v\n", graph.Index)
		// log.Printf("Edges: %v\n", graph.Edges)
	} else {
		log.Println("Graph creation failed")
	}
}
