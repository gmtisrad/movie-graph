package nameIndexer

import (
	"encoding/csv"
	"io"
	"log"
	"movie-graph/internal/models"
	"os"
	"strconv"
	"sync"
)

func getCsvReader() *csv.Reader {
	log.Println("Getting CSV reader")
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


func Find(id string) *models.Person {
	log.Printf("Finding person with ID: %s", id)
	// Check if the person is already in the index
	indexMutex.RLock()
	if person, ok := index[id]; ok {
		// If the index doesn't have the person, and we've completed indexing, return nil
		if person == nil && indexComplete {
			log.Printf("Index complete, but person not found: %s\n", id)
			indexMutex.RUnlock()
			return nil
		}
		indexMutex.RUnlock()
		log.Printf("Person found in index: %s", id)
		return person
	}
	indexMutex.RUnlock()

	reader := getCsvReader()
	for {
		// Check if the person is already in the index, other workers are indexing the same file
		indexMutex.RLock()
		person, ok := index[id]
		indexMutex.RUnlock()

		if person != nil && ok {			
			log.Printf("Person Cache Hit: %s", id)
			if indexComplete {
				log.Printf("Index complete, but person not found: %s\n", id)
				return nil
			}
			log.Printf("Index complete, but person not found: %s\n", id)
			return nil
		}


		nameRecord, err := reader.Read()

		if err == io.EOF {
			log.Printf("Indexing names complete\n")
			indexMutex.Lock()
			index[id] = nil
			indexMutex.Unlock()
			indexComplete = true
			break
		}
		if err != nil {
			log.Printf("Error reading record: %s", err)
			continue
		}

		// indexMutex.RLock()
		// log.Printf("Index: %v\n", index)
		// indexMutex.RUnlock()

		// Check if the person is already in the index at the start of each loop. Other workers are indexing the same file.
		indexMutex.RLock()
		if person, ok := index[id]; ok {
			indexMutex.RUnlock()
			log.Printf("Person found in index during iteration: %s", id)
			return person
		}
		indexMutex.RUnlock()

		if len(nameRecord) <= 4 {
			log.Printf("Record has less than 4 fields: %s", id)
			continue
		}

		nconst, primaryName, birthYear, deathYear := nameRecord[0], nameRecord[1], nameRecord[2], nameRecord[3]


		birthYearInt, _ := strconv.Atoi(birthYear)
		deathYearIntd, _ := strconv.Atoi(deathYear)

		principalPerson := &models.Person{
			ID:          nconst,
			PrimaryName: primaryName,
			BirthYear:   birthYearInt,
			DeathYear:   deathYearIntd,
		}

		indexMutex.Lock()
		index[nconst] = principalPerson
		indexMutex.Unlock()

		if nconst == id {
			// log.Printf("Found person %v\n", person)
			// log.Printf("index %v\n", index)
			indexMutex.RLock()
			log.Printf("Found person: %s", id)
			return principalPerson     
		}
	}

	indexMutex.Lock()	
	index[id] = nil
	indexMutex.Unlock()
	log.Printf("Person not found: %s", id)
	return nil
}
