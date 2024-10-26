package importer

import (
	"encoding/csv"
	"fmt"
	"movie-graph/internal/graph"
	"movie-graph/internal/importer/nameIndexer"
	"movie-graph/internal/importer/titleIndexer"
	"os"
	"sync"
	"time"
)

func IndexTitleNode(tconst string, movieGraph *graph.Graph) *graph.Node {
	principalTitle := titleIndexer.Find(tconst)

	var principalTitleNode *graph.Node
	if principalTitle != nil {
		principalTitleNode = &graph.Node{
			ID: principalTitle.ID,
			Value: principalTitle,
		}
		graph.AddVertex(movieGraph, principalTitleNode)
		return principalTitleNode
	} else {
		fmt.Printf("Principal Title not found for tconst: %s\n", tconst)
	}
	return nil
}

func IndexPersonNode(nconst string, movieGraph *graph.Graph) *graph.Node {
	principalPerson := nameIndexer.Find(nconst)

	var principalPersonNode *graph.Node
	if principalPerson != nil {
		principalPersonNode = &graph.Node{
			ID: principalPerson.ID,
			Value: principalPerson,
		}
		graph.AddVertex(movieGraph, principalPersonNode)
	} else {
		fmt.Printf("Principal Person not found for nconst: %s\n", nconst)
	}
	return principalPersonNode
}

func ProcessPrincipalRecord(principalRecord []string, movieGraph *graph.Graph) { 
	tconst, nconst := principalRecord[0], principalRecord[2]

	var wg sync.WaitGroup

	wg.Add(2)

	var principalPersonNode *graph.Node
	var principalTitleNode *graph.Node

	go func() {
		defer wg.Done()
		principalPersonNode = IndexPersonNode(nconst, movieGraph)
	}()

	go func() {
		defer wg.Done()
		principalTitleNode = IndexTitleNode(tconst, movieGraph)
	}()

	wg.Wait()

	if principalPersonNode != nil && principalTitleNode != nil {
		graph.AddEdge(movieGraph, principalPersonNode, principalTitleNode, false)
	}
}

func GenerateGraph() *graph.Graph {
	startTime := time.Now()
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
	lastUpdateTime := startTime

	for principalRecord, err := principalsReader.Read(); principalRecord != nil; principalRecord, err = principalsReader.Read() {
		if err != nil {
			panic(err)
		}

		ProcessPrincipalRecord(principalRecord, movieGraph)

		i++

		// Update terminal every 15 seconds
		if time.Since(lastUpdateTime) >= 15*time.Second {
			fmt.Printf("Processed %d records in %v\n", i, time.Since(startTime))
			lastUpdateTime = time.Now()
		}
	}
	
	endTime := time.Now()
	fmt.Printf("Graph creation completed. Total time: %v\n", endTime.Sub(startTime))
	return movieGraph
}