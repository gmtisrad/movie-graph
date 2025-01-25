package main

import (
	"encoding/csv"
	"log"
	"os"
)

type Title struct {
	ID string
	Type string
	Title string
	StartYear int
	EndYear int
}

type Person struct {
	ID string
	PrimaryName string
	BirthYear int
	DeathYear int
}

// GRAPH SHIT
type Node struct {
	ID string
	// No bueno me thinks like `any` in typescript
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
// END GRAPH SHIT

func GenerateGraphFromFiles() *Graph {
	file, err := os.Open("./data/title.principals.tsv")
	if err != nil {
			panic(err)
	}
	defer file.Close()

	// Create a new CSV reader with tab as the delimiter
	reader := csv.NewReader(file)
	reader.Comma = '\t'

	var index map[string]Node = make(map[string]Node)

	for indexRecord, err := reader.Read(); indexRecord != nil; indexRecord, err= reader.Read() {
		if err != nil {
			panic(err)
		}

		tconst, _, nconst, _, _ := indexRecord[0], indexRecord[1], indexRecord[2], indexRecord[3], indexRecord[4]

		title := &Title{
			ID: tconst,
		}

		person := &Person{
			ID: nconst,
		}
	}
}


/*
	title.principals
		tconst - Title ID - string
		ordering - Order of entries when Title ID is the same - int
		nconst - Person ID - string
		job - name of the job - string
		category - category of job - string

	name.basics
		nconst - Person ID - string
		primaryName - Name of person - string
		birthYear - ... - int
		deathYear - ... - int
		primaryProfession - listed professions on IMDB - []string

	title.basics
		tconst - Title ID - string
		titleType - Type of title - string
		primaryTitle - Movie's title - string
		originalTitle - original title? - string
		isAdult - is it pornog? - int (0 | 1)

	title.principals is a record of every "principal" in every title

	To generate graph + index
	1. Iterate over title.principals
	2. Check if the "title" has a record created
	2.a. If not, fetch title information from title.basics
	2.b. Create a title object and add it to the Graph Index + Vertices
	3. Check if the "principal" has a record in the graph
	3.a. If not, fetch "principal" information from name.basics
	3.b. Create a "Person" object and add it to the Graph Index + Vertices

	Export Graph to CSV
	Generate 2 files: Index.csv, Edges.csv

	Index.csv
	ID,       Value
	<string>, <serialized JSON>

	Edges.csv
	ID, Edges
	<string>, <[]ID[Node]>

	Import Graph from CSV
		file, err := os.Open("data.tsv")
    if err != nil {
        panic(err)
    }
    defer file.Close()

		// Create a new CSV reader with tab as the delimiter
    reader := csv.NewReader(file)
    reader.Comma = '\t'

    // Read all records from the TSV file
    records, err := reader.ReadAll()
    if err != nil {
        panic(err)
    }

		type IndexImportRow struct {
			ID,
			Value
		}
		var indexData []IndexImportRow = OS.open
		var vertices []Node = OS.open('Index.csv')
		
		var edges []ID[Node] = OS.open('Vertices.csv')
		graph := createGraph(vertices, edges)
*/

func main() {
	log.Println("hello world")
}