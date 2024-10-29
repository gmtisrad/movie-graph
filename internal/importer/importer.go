package importer

import (
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"movie-graph/internal/graph"
	"movie-graph/internal/importer/nameIndexer"
	"movie-graph/internal/importer/titleIndexer"
	"os"
	"sync"
	"time"
)

func IndexTitleNode(tconst string, movieGraph *graph.Graph) *graph.Node {
	// log.Printf("Indexing title node for tconst: %s", tconst)
	principalTitle := titleIndexer.Find(tconst)

	var principalTitleNode *graph.Node
	if principalTitle != nil {
		principalTitleNode = &graph.Node{
			ID: principalTitle.ID,
			Value: principalTitle,
		}
		graph.AddVertex(movieGraph, principalTitleNode)
		// log.Printf("Added title node to graph: %s", principalTitle.ID)
		return principalTitleNode
	} else {
		// log.Printf("Principal Title not found for tconst: %s", tconst)
	}
	return nil
}

func IndexPersonNode(nconst string, movieGraph *graph.Graph) *graph.Node {
	// log.Printf("Indexing person node for nconst: %s", nconst)
	principalPerson := nameIndexer.Find(nconst)

	var principalPersonNode *graph.Node
	if principalPerson != nil {
		principalPersonNode = &graph.Node{
			ID: principalPerson.ID,
			Value: principalPerson,
		}
		graph.AddVertex(movieGraph, principalPersonNode)
		// log.Printf("Added person node to graph: %s", principalPerson.ID)
	} else {
		// log.Printf("Principal Person not found for nconst: %s", nconst)
		// fmt.Printf("Principal Person not found for nconst: %s\n", nconst)
	}
	return principalPersonNode
}

func ProcessPrincipalRecord(principalRecord []string, movieGraph *graph.Graph) { 
	// log.Printf("Processing principal record")
	tconst, nconst := principalRecord[0], principalRecord[2]

	var wg sync.WaitGroup

	
	var principalPersonNode *graph.Node
	var principalTitleNode *graph.Node

	wg.Add(1)

	go func() {
		defer wg.Done()
		principalPersonNode = IndexPersonNode(nconst, movieGraph)
	}()

	wg.Add(1)

	go func() {
		defer wg.Done()
		principalTitleNode = IndexTitleNode(tconst, movieGraph)
	}()

	wg.Wait()

	if principalPersonNode != nil && principalTitleNode != nil {
		graph.AddEdge(movieGraph, principalPersonNode, principalTitleNode, false)
		// log.Printf("Added edge between person %s and title %s", principalPersonNode.ID, principalTitleNode.ID)
	}
}

func getCsvReader() *csv.Reader {
	log.Printf("Getting CSV reader")
	principalsFile, err := os.Open("./data/title.principals.tsv")
	if err != nil {
		log.Printf("Error opening file: %v", err)
		panic(err)
	}
	principalsReader := csv.NewReader(principalsFile)
	principalsReader.Comma = '\t'
	principalsReader.LazyQuotes = true
	principalsReader.FieldsPerRecord = -1
	principalsReader.ReuseRecord = false // Allow reusing the same slice for each record. With mutexes, this is safe

	// Throw away the first line, headers
	_, err = principalsReader.Read()
	if err != nil {
		log.Printf("Error reading header: %v", err)
		panic(err)
	}

	return principalsReader
}

// No results, the workers are silent
func worker(wg *sync.WaitGroup, jobs <-chan []string, results chan<- interface{}, movieGraph *graph.Graph) {
	log.Printf("Worker started")
	defer wg.Done()
	for principalRecord := range jobs {
		ProcessPrincipalRecord(principalRecord, movieGraph)
		results <- struct{}{}
	}
	log.Printf("Worker finished")
}

func GenerateGraph() *graph.Graph {
	log.Printf("Starting graph generation")
	startTime := time.Now()
	movieGraph := graph.CreateGraph()
	principalsReader := getCsvReader()

	// Throw away the first line, headers
	principalsReader.Read()
	var edgeCount int = 0
	lastUpdateTime := startTime

	var wg sync.WaitGroup
	var workerWg sync.WaitGroup // Separate wait group for workers
	// Dynamic workers that scale with demand, or spin up as indexers complete
	const numWorkers = 64
	jobs := make(chan []string, numWorkers)
	results := make(chan interface{}, numWorkers)

	for i := 0; i < numWorkers; i++ {
		workerWg.Add(1)
		go worker(&workerWg, jobs, results, movieGraph)
	}

	// Goroutine to read records and send them to the jobs channel
	wg.Add(1)
	go func() {
		defer wg.Done()
		defer close(jobs)
		i := 0

		for {
			principalRecord, err := principalsReader.Read()
			if err != nil {
				if err == io.EOF {
					log.Printf("Reached end of file")
					break
				}
				log.Printf("Error reading record: %v", err)
				panic(err)
			}
			jobs <- principalRecord
			if i % 1000000 == 0 {
				fmt.Printf("Processed %d records in %v\n", edgeCount, time.Since(startTime))
			}
			i++
		}
	}()

	// Goroutine to close the results channel after all workers are done
	go func() {
		workerWg.Wait() // Wait for all workers to finish
		close(results)
	}()

	// Goroutine to handle results
	wg.Add(1)
	go func() {
		defer wg.Done()
		for range results {
			if edgeCount % 1000000 == 0 {
				fmt.Printf("Processed %d records in %v\n", edgeCount, time.Since(startTime))
			}
			if time.Since(lastUpdateTime) >= 15*time.Second {		
				fmt.Printf("Processed %d records in %v\n", edgeCount, time.Since(startTime))
				lastUpdateTime = time.Now()
			}
			edgeCount++
		}
	}()

	wg.Wait()
	
	endTime := time.Now()
	fmt.Printf("Graph creation completed. Total time: %v\n", endTime.Sub(startTime))
	log.Printf("Graph generation finished. Total edges: %d", edgeCount)
	return movieGraph
}