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

	indexMutex.RLock()
	for id, node := range graph.Index {
		jsonValue, err := json.Marshal(node.Value)
		if err != nil {
			log.Printf("Error marshaling node value: %s\n", err)
			continue
		}
		if err := indexWriter.Write([]string{id, string(jsonValue)}); err != nil {
			log.Printf("Error writing to Index.csv: %s\n", err)
			indexMutex.RUnlock()
			return
		}
	}
	indexMutex.RUnlock()

	// Export Edges.csv
	edgesFile, err := os.Create(filepath.Join(path, "Edges.csv"))
	if err != nil {
		log.Printf("Error creating Edges.csv: %s\n", err)
		return
	}
	defer edgesFile.Close()

	edgesWriter := csv.NewWriter(edgesFile)
	defer edgesWriter.Flush()

	edgesMutex.RLock()
	for fromID, toIDs := range graph.Edges {
		for _, toID := range toIDs {
			if err := edgesWriter.Write([]string{fromID, toID}); err != nil {
				log.Printf("Error writing to Edges.csv: %s\n", err)
				edgesMutex.RUnlock()
				return
			}
		}
	}
	edgesMutex.RUnlock()
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

	var indexCount int = 0
	indexReader := csv.NewReader(indexFile)
	for {
		if indexCount % 1000000 == 0 {
			log.Printf("Index count: %d\n", indexCount)
		}
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
		indexCount++
	}

	// Import Edges.csv
	edgesFile, err := os.Open(filepath.Join(path, "Edges.csv"))
	if err != nil {
		return nil, fmt.Errorf("error opening Edges.csv: %v", err)
	}
	defer edgesFile.Close()

	var edgesCount int = 0
	edgesReader := csv.NewReader(edgesFile)
	for {
		if edgesCount % 1000000 == 0 {
			log.Printf("Edges count: %d\n", edgesCount)
		}
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
		indexMutex.RLock()
		fromNode, ok := graph.Index[fromID]
		if !ok {
			indexMutex.RUnlock()
			return nil, fmt.Errorf("node not found for ID: %s", fromID)
		}
		toNode, ok := graph.Index[toID]
		if !ok {
			indexMutex.RUnlock()
			return nil, fmt.Errorf("node not found for ID: %s", toID)
		}
		indexMutex.RUnlock()

		AddEdge(graph, fromNode, toNode, true) // Assuming directed edges
		edgesCount++
	}

	return graph, nil
}

func GetNeighbors(graph *Graph, node *Node) []string {
	edgesMutex.RLock()
	neighbors := graph.Edges[node.ID]
	edgesMutex.RUnlock()
	return neighbors
}

func GetNeighborNodes(graph *Graph, node *Node) []*Node {
	neighbors := GetNeighbors(graph, node)
	var neighborNodes []*Node
	for _, neighbor := range neighbors {
		neighborNodes = append(neighborNodes, GetNode(graph, neighbor))
	}
	return neighborNodes
}

func GetNode(graph *Graph, id string) *Node {
	indexMutex.RLock()
	node := graph.Index[id]
	indexMutex.RUnlock()
	return node
}

func GetNodeAndNeighborsToNDepth(graph *Graph, node *Node, depth int) ([]*Node, [][2]string) {
	visited := make(map[string]bool)
	var vertices []*Node
	var edges [][2]string
	
	// Add initial node
	vertices = append(vertices, node)
	visited[node.ID] = true
	
	currentNodes := []*Node{node}
	for currentDepth := 0; currentDepth < depth; currentDepth++ {
		var nextNodes []*Node
		
		for _, currentNode := range currentNodes {
			neighbors := GetNeighborNodes(graph, currentNode)
			// Temporary CODE
			// Limit to maximum 4 neighbors, but only if we have that many
			// if len(neighbors) > 4 {
			// 	neighbors = neighbors[:4]
			// }
			
			for _, neighbor := range neighbors {
				// Skip if we've already visited this node
				if visited[neighbor.ID] {
					continue
				}
				
				visited[neighbor.ID] = true
				vertices = append(vertices, neighbor)
				edges = append(edges, [2]string{currentNode.ID, neighbor.ID})
				nextNodes = append(nextNodes, neighbor)
			}
		}
		
		currentNodes = nextNodes
	}
	
	return vertices, edges
}
