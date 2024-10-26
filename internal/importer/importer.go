package importer

import (
	"encoding/csv"
	"fmt"
	"movie-graph/internal/graph"
	"movie-graph/internal/importer/nameIndexer"
	"movie-graph/internal/importer/titleIndexer"
	"os"
)

func GenerateGraph() *graph.Graph {
	movieGraph := graph.CreateGraph()

	principalsFile, err := os.Open("./data/title.principals.tsv")
	if err != nil {
		panic(err)
	}
	defer principalsFile.Close()


	principalsReader := csv.NewReader(principalsFile)
	principalsReader.Comma = '\t'
	principalsReader.LazyQuotes = true

	// Throw away the first line, headers
	principalsReader.Read()
	var i int = 0

	for principalRecord, err := principalsReader.Read(); principalRecord != nil; principalRecord, err = principalsReader.Read() {
		if err != nil {
			panic(err)
		}

		tconst, nconst := principalRecord[0], principalRecord[2]
		principalPerson := nameIndexer.Find(nconst)
		principalTitle := titleIndexer.Find(tconst)

		var principalPersonNode *graph.Node
		if principalPerson != nil {
			principalPersonNode = &graph.Node{
			ID: principalPerson.ID,
			Value: principalPerson,
			}
			graph.AddVertex(movieGraph, principalPersonNode)
		} else {
			fmt.Printf("Principal Person not found for tconst: %s, nconst: %s\n", tconst, nconst)
		}

		var principalTitleNode *graph.Node
		if principalTitle != nil {
			principalTitleNode = &graph.Node{
				ID: principalTitle.ID,
				Value: principalTitle,
			}
			graph.AddVertex(movieGraph, principalTitleNode)
		} else {
			fmt.Printf("Principal Title not found for tconst: %s, nconst: %s\n", tconst, nconst)
		}

		if principalPersonNode != nil && principalTitleNode != nil {
			fmt.Printf("Adding edge between %s and %s\n", principalPersonNode.ID, principalTitleNode.ID)
			if i%1000 == 0 && i != 0 {
				graph.ExportGraph(movieGraph, "./export")
				break
			}
			graph.AddEdge(movieGraph, principalPersonNode, principalTitleNode, false)
		}
		i++
	}
	
	return movieGraph
}