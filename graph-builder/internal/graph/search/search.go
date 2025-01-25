package search

import (
	"fmt"
	"movie-graph/internal/graph"
	"sync"
)

// DFS might be a shitty idea
func DFS(searchGraph *graph.Graph, startNode *graph.Node, endNode *graph.Node, paths [][]*graph.Node, currentPath []*graph.Node, visited map[string]interface{}, visitedMutex *sync.RWMutex) [][]*graph.Node {
	var operandNode *graph.Node
	if len(currentPath) == 0 {
		operandNode = startNode
	} else {
		operandNode = currentPath[len(currentPath)-1]
	}
	
	currentNeighbors := graph.GetNeighbors(searchGraph, operandNode)

	for _, edge := range currentNeighbors {
		if edge == endNode.ID {
			visitedMutex.Lock()
			visited[edge] = true
			visitedMutex.Unlock()
			newPath := append(currentPath, endNode)
			return append(paths, newPath)
		}
	}

	for _, edge := range currentNeighbors {
		var neighbor *graph.Node

		visitedMutex.Lock()
		if _, ok := visited[edge]; !ok {
			visited[edge] = true
			visitedMutex.Unlock()
			neighbor = graph.GetNode(searchGraph, edge)
			newPath := append(currentPath, neighbor)
			paths = append(paths, DFS(searchGraph, startNode, endNode, paths, newPath, visited, visitedMutex)...)
		} else {
			visitedMutex.Unlock()
		}
	}
	return paths
}

func BFS(searchGraph *graph.Graph, startNode *graph.Node, endNode *graph.Node) [][]*graph.Node {
	queue := [][]*graph.Node{{startNode}}
	paths := [][]*graph.Node{}
	visited := make(map[string]interface{})
	visited[startNode.ID] = true

	for len(queue) > 0 {
		currentPath := queue[0]
		queue = queue[1:]
		currentNode := currentPath[len(currentPath)-1]

		neighbors := graph.GetNeighbors(searchGraph, currentNode)

		for _, neighborID := range neighbors {
			_, isVisited := visited[neighborID] 

			if !isVisited {
				neighbor := graph.GetNode(searchGraph, neighborID)
				newPath := make([]*graph.Node, len(currentPath))
				copy(newPath, currentPath)
				newPath = append(newPath, neighbor)

				if neighborID == endNode.ID {
					paths = append(paths, newPath)
				} else {
					visited[neighborID] = true
					queue = append(queue, newPath)
				}
			}
		}
	}

	// Prints path nodes with `->` between them and a new line at the end of each path
	for _, path := range paths {
		for _, node := range path {
			fmt.Print(node.ID)
			if node.ID != path[len(path)-1].ID {
				fmt.Print("->")
			}
		}
		fmt.Println()
	}	

	return paths
}