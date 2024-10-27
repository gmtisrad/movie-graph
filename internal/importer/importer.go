package importer

import (
	"bufio"
	"encoding/csv"
	"fmt"
	"movie-graph/internal/graph"
	"movie-graph/internal/importer/nameIndexer"
	"movie-graph/internal/importer/titleIndexer"
	"os"
	"runtime/debug"
	"sync"
	"time"
)

func init() {
	debug.SetTraceback("crash")
}

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

	const maxBufferSize = 1024 * 1024 * 1024 // 1GB - Too much?
	principalsReader := csv.NewReader(bufio.NewReaderSize(principalsFile, maxBufferSize))
	principalsReader.Comma = '\t'
	principalsReader.LazyQuotes = true
	principalsReader.FieldsPerRecord = -1
	principalsReader.ReuseRecord = false // Allow reusing the same slice for each record. With mutexes, this is safe


	// Throw away the first line, headers
	principalsReader.Read()
	var i int = 0
	lastUpdateTime := startTime

	var wg sync.WaitGroup
	// semaphore is to limit the number of goroutines to 10
	// struct{} is an empty struct, which is a zero-size memory allocation
	// Just a flag to check if the goroutine is done
	semaphore := make(chan struct{}, 1)

	for principalRecord, err := principalsReader.Read(); principalRecord != nil; principalRecord, err = principalsReader.Read() {
		wg.Add(1)
		semaphore <- struct{}{}

		go func(record []string) {
			fmt.Println("Processing record")
			defer wg.Done()
			<-semaphore
			ProcessPrincipalRecord(record, movieGraph)
		}(principalRecord)
		if err != nil {
			panic(err)
		}
		i++

		// Update terminal every 15 seconds
		if time.Since(lastUpdateTime) >= 15*time.Second {
			fmt.Printf("Processed %d records in %v\n", i, time.Since(startTime))
			lastUpdateTime = time.Now()
		}
	}
	wg.Wait()
	
	endTime := time.Now()
	fmt.Printf("Graph creation completed. Total time: %v\n", endTime.Sub(startTime))
	return movieGraph
}