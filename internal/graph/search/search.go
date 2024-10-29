package search

import "movie-graph/internal/graph"

func DjikstraShortestPath(graph *graph.Graph, startNode *graph.Node, endNode *graph.Node) []graph.Node {
	func (graph *graph.Graph, startNode *graph.Node, endNode *graph.Node) []graph.Node {
		queue := []graph.Node{startNode}
		visited := make(map[string]bool)
		visited[startNode.ID] = true
		for len(queue) > 0 {
			currentNode := queue[0]
			queue = queue[1:]
		}
	}
}