package main

import (
	"bufio"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"movie-graph/internal/graph"
	"movie-graph/internal/graph/search"
	"movie-graph/internal/importer"
	"movie-graph/internal/webServer"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func main() {
	// Set up logging
	SetupLogging()

	var movieGraph *graph.Graph
	reader := bufio.NewReader(os.Stdin)

	// Existing CLI loop
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
			movieGraph = ImportExistingGraph(reader)
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
			// Start HTTP server in a goroutine
			go func() {
				if err := webServer.StartServer(3000, movieGraph); err != nil {
					log.Printf("HTTP server error: %v\n", err)
				}
			}()
			fmt.Println("HTTP server started on :3000")
			searchMenu(movieGraph, reader)
		}
	}
}

func SetupLogging() {
	logFile, err := os.OpenFile("app.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Printf("Error opening log file: %v\n", err)
		return
	}
	log.SetOutput(logFile)
}

func ImportExistingGraph(reader *bufio.Reader) *graph.Graph {
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
	for {
		fmt.Println("\n=== Search Menu ===")
		fmt.Println("1. Perform new search")
		fmt.Println("2. View node neighbors")
		fmt.Println("3. Back to main menu")
		fmt.Print("Choose an option: ")

		choice, _ := reader.ReadString('\n')
		choice = strings.TrimSpace(choice)

		switch choice {
		case "1":
			PerformSearch(movieGraph, reader)
		case "2":
			ViewNodeNeighbors(movieGraph, reader)
		case "3":
			return
		default:
			fmt.Println("Invalid option, please try again")
		}
	}
}

func PerformSearch(movieGraph *graph.Graph, reader *bufio.Reader) {
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
		log.Println("Search completed successfully")
	} else {
		log.Println("Search failed")
	}
}

func ViewNodeNeighbors(movieGraph *graph.Graph, reader *bufio.Reader) {
	var startNode *graph.Node

	// Get start node
	for startNode == nil {
		fmt.Print("Enter node ID: ")
		nodeID, _ := reader.ReadString('\n')
		nodeID = strings.TrimSpace(nodeID)
		
		startNode = graph.GetNode(movieGraph, nodeID)
		if startNode == nil {
			fmt.Println("Node not found. Please try again.")
		}
	}

	// Get depth
	fmt.Print("Enter depth to search (1-5): ")
	depthStr, _ := reader.ReadString('\n')
	depthStr = strings.TrimSpace(depthStr)
	depth := 1
	fmt.Sscan(depthStr, &depth)
	
	if depth < 1 {
		depth = 1
	} else if depth > 5 {
		depth = 5
	}

	vertices, edges := graph.GetNodeAndNeighborsToNDepth(movieGraph, startNode, depth)

	// log.Printf("Found %d vertices and %d connections:\n", len(vertices), len(edges))
	// log.Println("Vertices:")
	// for _, v := range vertices {
	// 	log.Printf("- %s\n", v.ID)
	// }
	
	// log.Println("Connections:")
	// for _, e := range edges {
	// 	log.Printf("- %s -> %s\n", e[0], e[1])
	// }
	
	fmt.Printf("\nFound %d vertices and %d connections:\n", len(vertices), len(edges))
	// fmt.Println("\nVertices:")
	// for _, v := range vertices {
	// 	fmt.Printf("- %s\n", v.ID)
	// }
	
	// fmt.Println("\nConnections:")
	// for _, e := range edges {
	// 	fmt.Printf("- %s -> %s\n", e[0], e[1])
	// }

	// Create export directory with root node ID
	exportPath := filepath.Join("export", startNode.ID)
	if err := os.MkdirAll(exportPath, os.ModePerm); err != nil {
		log.Printf("Error creating export directory: %s\n", err)
		return
	}

	// Export Index.csv
	indexFile, err := os.Create(filepath.Join(exportPath, "Index.csv"))
	if err != nil {
		log.Printf("Error creating Index.csv: %s\n", err)
		return
	}
	defer indexFile.Close()

	indexWriter := csv.NewWriter(indexFile)
	defer indexWriter.Flush()

	for _, vertex := range vertices {
		jsonValue, err := json.Marshal(vertex.Value)
		if err != nil {
			log.Printf("Error marshaling vertex value: %s\n", err)
			continue
		}
		if err := indexWriter.Write([]string{vertex.ID, string(jsonValue)}); err != nil {
			log.Printf("Error writing to Index.csv: %s\n", err)
			return
		}
	}

	// Export Edges.csv
	edgesFile, err := os.Create(filepath.Join(exportPath, "Edges.csv"))
	if err != nil {
		log.Printf("Error creating Edges.csv: %s\n", err)
		return
	}
	defer edgesFile.Close()

	edgesWriter := csv.NewWriter(edgesFile)
	defer edgesWriter.Flush()

	for _, edge := range edges {
		if err := edgesWriter.Write([]string{edge[0], edge[1]}); err != nil {
			log.Printf("Error writing to Edges.csv: %s\n", err)
			return
		}
	}

	fmt.Printf("Exported data to %s\n", exportPath)
}
