package graph

type Node struct {
	ID    string
	Value interface{}
}

type Graph struct {
	Edges map[string][]*Node
	Index map[string]*Node
}

func AddVertex(graph Graph, vertex *Node) {
	graph.Index[vertex.ID] = vertex
}

func AddEdge(graph *Graph, vertexA *Node, vertexB *Node) {
	vertexAEdges := append(graph.Edges[vertexA.ID], vertexB)
	vertexBEdges := append(graph.Edges[vertexB.ID], vertexA)

	graph.Edges[vertexA.ID] = vertexAEdges
	graph.Edges[vertexB.ID] = vertexBEdges
}

func CreateGraph() *Graph {
	return &Graph{
		Edges: make(map[string][]*Node),
		Index: make(map[string]*Node),
	}
}
