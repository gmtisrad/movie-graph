package graph

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sync"
)

type Node struct {
	ID    string
	Value interface{}
}

type Graph struct {
	Edges map[string][]string
	Index map[string]*Node
}

var indexMutex sync.RWMutex
var edgesMutex sync.RWMutex

func AddVertex(graph *Graph, vertex *Node) {
	// Prevent duplicates
	indexMutex.RLock()
	if _, ok := graph.Index[vertex.ID]; ok {
		indexMutex.RUnlock()
		return
	}
	indexMutex.RUnlock()
	
	indexMutex.Lock()
	graph.Index[vertex.ID] = vertex
	indexMutex.Unlock()
}

func AddEdge(graph *Graph, vertexA *Node, vertexB *Node, directed bool) {
	addUniqueEdge := func(from, to string) {
		edgesMutex.RLock()
		edges := graph.Edges[from]
		edgesMutex.RUnlock()
		if edges == nil {
			edges = []string{}
		}
		for _, edge := range edges {
			if edge == to {
				return // Edge already exists
			}
		}
		edgesMutex.Lock()
		graph.Edges[from] = append(edges, to)
		edgesMutex.Unlock()
	}

	addUniqueEdge(vertexA.ID, vertexB.ID)

	if !directed {
		addUniqueEdge(vertexB.ID, vertexA.ID)
	}
}

func ExportGraph(graph *Graph, path string) {
	// Create the directory if it doesn't exist
	if err := os.MkdirAll(path, os.ModePerm); err != nil {
		log.Printf("Error creating directory: %s\n", err)
		return
	}

	// Export Index.csv
	indexFile, err := os.Create(filepath.Join(path, "Index.csv"))
	if err != nil {
		log.Printf("Error creating Index.csv: %s\n", err)
		return
	}
	defer indexFile.Close()

	indexWriter := csv.NewWriter(indexFile)
	defer indexWriter.Flush()

	for id, node := range graph.Index {
		jsonValue, err := json.Marshal(node.Value)
		if err != nil {
			log.Printf("Error marshaling node value: %s\n", err)
			continue
		}
		if err := indexWriter.Write([]string{id, string(jsonValue)}); err != nil {
			log.Printf("Error writing to Index.csv: %s\n", err)
			return
		}
	}

	// Export Edges.csv
	edgesFile, err := os.Create(filepath.Join(path, "Edges.csv"))
	if err != nil {
		log.Printf("Error creating Edges.csv: %s\n", err)
		return
	}
	defer edgesFile.Close()

	edgesWriter := csv.NewWriter(edgesFile)
	defer edgesWriter.Flush()

	for fromID, toIDs := range graph.Edges {
		for _, toID := range toIDs {
			if err := edgesWriter.Write([]string{fromID, toID}); err != nil {
				log.Printf("Error writing to Edges.csv: %s\n", err)
				return
			}
		}
	}
}

func CreateGraph() *Graph {
	return &Graph{
		Edges: make(map[string][]string),
		Index: make(map[string]*Node),
	}
}

func ImportGraph(path string) (*Graph, error) {
	graph := CreateGraph()

	// Import Index.csv
	indexFile, err := os.Open(filepath.Join(path, "Index.csv"))
	if err != nil {
		return nil, fmt.Errorf("error opening Index.csv: %v", err)
	}
	defer indexFile.Close()

	indexReader := csv.NewReader(indexFile)
	for {
		record, err := indexReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error reading Index.csv: %s", err)
		}
		if len(record) != 2 {
			return nil, fmt.Errorf("invalid record in Index.csv: %v", record)
		}

		id, jsonValue := record[0], record[1]
		var value interface{}
		if err := json.Unmarshal([]byte(jsonValue), &value); err != nil {
			return nil, fmt.Errorf("error unmarshaling node value: %v", err)
		}

		node := &Node{ID: id, Value: value}
		AddVertex(graph, node)
	}

	// Import Edges.csv
	edgesFile, err := os.Open(filepath.Join(path, "Edges.csv"))
	if err != nil {
		return nil, fmt.Errorf("error opening Edges.csv: %v", err)
	}
	defer edgesFile.Close()

	edgesReader := csv.NewReader(edgesFile)
	for {
		record, err := edgesReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error reading Edges.csv: %v", err)
		}
		if len(record) != 2 {
			return nil, fmt.Errorf("invalid record in Edges.csv: %v", record)
		}

		fromID, toID := record[0], record[1]
		fromNode, ok := graph.Index[fromID]
		if !ok {
			return nil, fmt.Errorf("node not found for ID: %s", fromID)
		}
		toNode, ok := graph.Index[toID]
		if !ok {
			return nil, fmt.Errorf("node not found for ID: %s", toID)
		}

		AddEdge(graph, fromNode, toNode, true) // Assuming directed edges
	}

	return graph, nil
}
