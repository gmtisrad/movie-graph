package titleIndexer

import (
	"encoding/csv"
	"io"
	"log"
	"movie-graph/internal/models"
	"os"
	"strconv"
	"sync"
)

var index map[string]*models.Title = make(map[string]*models.Title)
var indexMutex sync.RWMutex
var indexComplete bool = false

func getCsvReader() *csv.Reader {
	log.Println("Getting CSV reader")
	titleBasicsFile, err := os.Open("./data/title.basics.tsv")
	if err != nil {
		log.Printf("Error opening file: %v", err)
		return nil
	}

	csvReader := csv.NewReader(titleBasicsFile)
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

func Find(id string) *models.Title {
	log.Printf("Finding title with ID: %s", id)
	// Check if the title is already in the index before we bother reading the file
	indexMutex.RLock()
	if title, ok := index[id]; ok {
		// If the index doesn't have the title, and we've completed indexing, return nil
		if title == nil && indexComplete {
			indexMutex.RUnlock()
			log.Printf("Title not found in completed index for ID: %s", id)
			return nil
		}
		indexMutex.RUnlock()
		log.Printf("Title found in index for ID: %s", id)
		return title
	}
	indexMutex.RUnlock()

	reader := getCsvReader()
	for {
		// Check if the title is already in the index, other workers are indexing the same file
		indexMutex.RLock()
		if title, ok := index[id]; ok && title != nil {
			indexMutex.RUnlock()
			log.Printf("Title found in index during iteration for ID: %s", id)
			return title
		}
		indexMutex.RUnlock()

		titleRecord, err := reader.Read()

		if err == io.EOF {
			log.Printf("Indexing titles complete\n")
			indexMutex.Lock()
			index[id] = nil
			indexMutex.Unlock()
			indexComplete = true
			break
		}
		if err != nil {
			// Log the error and continue
			log.Printf("Error reading record: %v\n", err)
			continue
		}

		// Ensure we have at least the required number of fields
		if len(titleRecord) < 4 {
				log.Printf("Skipping record with insufficient fields: %v\n", titleRecord)
				continue
		}

		indexMutex.RLock()
		if title, ok := index[id]; ok {
			indexMutex.RUnlock()
			log.Printf("Title found in index during second check for ID: %s", id)
			return title
		}
		indexMutex.RUnlock()

		// Ensure we have at least 4 fields
		if len(titleRecord) < 4 {
			log.Printf("Skipping record with insufficient fields: %v\n", titleRecord)
			continue
		}

		titleID, titleType, title, startYear, endYear := titleRecord[0], titleRecord[1], titleRecord[2], titleRecord[5], titleRecord[6]

		startYearInt, err := strconv.Atoi(startYear)
		if err != nil {
			log.Printf("Error converting start year to int for ID %s: %v", titleID, err)
			startYearInt = -1
		}

		endYearInt, err := strconv.Atoi(endYear)
		if err != nil {
			log.Printf("Error converting end year to int for ID %s: %v", titleID, err)
			endYearInt = -1
		}

		indexMutex.Lock()
		index[titleID] = &models.Title{
			ID: titleID,
			Type: titleType,
			Title: title,
			StartYear: startYearInt,
			EndYear:   endYearInt,
		}
		indexMutex.Unlock()
		
		if titleID == id {
			log.Printf("Found title %s\n", titleID)
			return index[titleID]
		}
	}

	log.Printf("Did not find title %v\n", id)
	indexMutex.Lock()
	index[id] = nil
	indexMutex.Unlock()

	return nil
}
