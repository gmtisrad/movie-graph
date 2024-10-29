package nameIndexer

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
	nameBasicsFile, err := os.Open("./data/name.basics.tsv")
	if err != nil {
		log.Printf("Error reading header: %s", err)
		return nil
	}
	if err != nil {
		log.Printf("Error opening file: %s", err)
		return nil
	}
	csvReader := csv.NewReader(nameBasicsFile)
	csvReader.Comma = '\t'
	csvReader.LazyQuotes = true
	csvReader.FieldsPerRecord = -1
	
	// Throw away the first line, headers
	csvReader.Read()

	log.Println("CSV reader created successfully")
	return csvReader
}

var index map[string]*models.Person = make(map[string]*models.Person)
var indexMutex sync.RWMutex
var indexComplete bool = false
var indexerOnce sync.Once

func spawnIndexer() {
	go func() {
		log.Println("Spawning name indexer")
		csvReader := getCsvReader()
		for {
			nameRecord, err := csvReader.Read()
			if err == io.EOF {
				indexComplete = true
				log.Println("Name indexer complete")
				break
			}
			if err != nil {
				log.Printf("Error reading record: %s", err)
				continue
			}
			if len(nameRecord) <= 4 {
				// Swallow error silently
				// log.Printf("Record has less than 4 fields: %s", nameRecord)
				continue
			}

			nconst, primaryName, birthYear, deathYear := nameRecord[0], nameRecord[1], nameRecord[2], nameRecord[3]

			birthYearInt, err := strconv.Atoi(birthYear)
			if err != nil {
				// swallow error silently
				continue
			}
			deathYearInt, err := strconv.Atoi(deathYear)
			if err != nil {
				// swallow error silently
				continue
			}
			principalPerson := &models.Person{
				ID:          nconst,
				PrimaryName: primaryName,
				BirthYear:   birthYearInt,
				DeathYear:   deathYearInt,
			}

			indexMutex.Lock()
			index[nconst] = principalPerson
			indexMutex.Unlock()
		}
	}()
}


func Find(id string) *models.Person {
	// Ensure only one indexer is spawned. Find will be called from multiple workers.
	indexerOnce.Do(spawnIndexer)

	// log.Printf("Finding person with ID: %s", id)
	// Check if the person is already in the index
	for {
		// log.Printf("Checking if person is in index: %s", id)
		// Check if the person is already in the index, other workers are indexing the same file
		indexMutex.RLock()
		person, ok := index[id]
		indexMutex.RUnlock()

		if person != nil && ok {
			log.Printf("Person Cache Hit: %s", id)
			return person
		}

		if indexComplete {
			log.Printf("Index complete, but person not found: %s\n", id)
			return nil
		}

		time.Sleep(10 * time.Millisecond)
	}
}
