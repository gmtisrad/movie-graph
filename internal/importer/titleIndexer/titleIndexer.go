package titleIndexer

import (
	"encoding/csv"
	"io"
	"log"
	"movie-graph/internal/models"
	"os"
	"strconv"
	"sync"
	"time"
)

var csvReader *csv.Reader
func getCsvReader() *csv.Reader {
	if csvReader != nil {
		return csvReader
	}
	log.Println("Creating CSV Singleton")
	titleBasicsFile, err := os.Open("./data/title.basics.tsv")
	if err != nil {
		log.Printf("Error opening file: %v", err)
		return nil
	}

	csvReader = csv.NewReader(titleBasicsFile)
	csvReader.Comma = '\t'
	csvReader.LazyQuotes = true
	csvReader.FieldsPerRecord = -1

	// Throw away the first line, headers
	_, err = csvReader.Read()
	if err != nil && err != io.EOF {
		log.Printf("Error reading header: %v", err)
		return nil
	}

	log.Println("CSV reader created successfully")
	return csvReader
}

var index map[string]*models.Title = make(map[string]*models.Title)
var indexMutex sync.RWMutex
var indexComplete bool = false
var indexerOnce sync.Once

func spawnIndexer() {
	log.Println("Spawning title indexer")
	go func() {
		csvReader := getCsvReader()
		for {
			titleRecord, err := csvReader.Read()
			if err == io.EOF {
				log.Println("Title indexer complete")
				indexComplete = true
				break
			}
			if err != nil {
				log.Printf("Error reading record: %v\n", err)
				continue
			}

			if len(titleRecord) < 7 {
				// Swallow error silently
				continue
			}

			titleID, titleType, title, startYear, endYear := titleRecord[0], titleRecord[1], titleRecord[2], titleRecord[5], titleRecord[6]

			startYearInt, err := strconv.Atoi(startYear)
			if err != nil {
				// swallow error silently
				startYearInt = -1
			}

			endYearInt, err := strconv.Atoi(endYear)
			if err != nil {
				// swallow error silently
				endYearInt = -1
			}

			indexMutex.Lock()
			index[titleID] = &models.Title{
				ID:        titleID,
				Type:      titleType,
				Title:     title,
				StartYear: startYearInt,
				EndYear:   endYearInt,
			}
			indexMutex.Unlock()
		}
	}()
}

func Find(id string) *models.Title {
	// Ensure only one indexer is spawned. Find will be called from multiple workers.
	indexerOnce.Do(spawnIndexer)

	log.Printf("Finding title with ID: %s", id)
	// Check if the title is already in the index
	for {
		log.Printf("Checking if title is in index: %s", id)
		// Check if the title is already in the index, other workers are indexing the same file
		indexMutex.RLock()
		title, ok := index[id]
		indexMutex.RUnlock()

		if title != nil && ok {
			log.Printf("Title Cache Hit: %s", id)
			return title
		}

		if indexComplete {
			log.Printf("Index complete, but title not found: %s\n", id)
			return nil
		}

		time.Sleep(10 * time.Millisecond)
	}
}
