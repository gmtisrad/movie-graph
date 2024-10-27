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

var csvReader *csv.Reader
func getCsvReader() *csv.Reader {
	if csvReader == nil {
		nameBasicsFile, err := os.Open("./data/name.basics.tsv")
		if err != nil {
			log.Printf("Error opening file: %v", err)
			return nil
		}
		csvReader = csv.NewReader(nameBasicsFile)
		csvReader.Comma = '\t'
		csvReader.LazyQuotes = true
		csvReader.FieldsPerRecord = -1
	}
	return csvReader
}

var index map[string]*models.Person = make(map[string]*models.Person)
var indexMutex sync.RWMutex

func Find(id string) *models.Person {
	// Check if the person is already in the index
	indexMutex.RLock()
	if person, ok := index[id]; ok {
		indexMutex.RUnlock()
		return person
	}
	indexMutex.RUnlock()

	nameBasicsReader := getCsvReader()

	// Throw away the first line, headers
	_, readerErr := nameBasicsReader.Read()
	if readerErr != nil {
		log.Printf("Error reading header: %v", readerErr)
		return nil
	}

	for nameRecord, err := nameBasicsReader.Read(); nameRecord != nil; nameRecord, err = nameBasicsReader.Read() {
		if err == io.EOF {
			break
		}
		if err != nil {
			// Log the error and continue
			log.Printf("Error reading record: %v", err)
			continue
		}

		// Ensure we have at least 4 fields
		if len(nameRecord) < 4 {
			continue
		}

		nconst, primaryName, birthYear, deathYear := nameRecord[0], nameRecord[1], nameRecord[2], nameRecord[3]

		birthYearInt, _ := strconv.Atoi(birthYear)
		deathYearInt, _ := strconv.Atoi(deathYear)

		person := &models.Person{
			ID:          nconst,
			PrimaryName: primaryName,
			BirthYear:   birthYearInt,
			DeathYear:   deathYearInt,
		}

		indexMutex.Lock()
		index[nconst] = person
		indexMutex.Unlock()

		if nconst == id {
			return person
		}
	}

	indexMutex.Lock()
	index[id] = nil
	indexMutex.Unlock()

	return nil
}
