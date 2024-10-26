package nameIndexer

import (
	"encoding/csv"
	"io"
	"log"
	"movie-graph/internal/models"
	"os"
	"strconv"
)

var index map[string]*models.Person = make(map[string]*models.Person)

func Find(id string) *models.Person {
	if person, ok := index[id]; ok {
		return person
	}

	nameBasicsFile, err := os.Open("./data/name.basics.tsv")
	if err != nil {
		log.Printf("Error opening file: %v", err)
		return nil
	}
	defer nameBasicsFile.Close()

	nameBasicsReader := csv.NewReader(nameBasicsFile)
	nameBasicsReader.Comma = '\t'
	nameBasicsReader.LazyQuotes = true  // Allow lazy quotes
	nameBasicsReader.FieldsPerRecord = -1  // Allow variable number of fields

	// Throw away the first line, headers
	_, err = nameBasicsReader.Read()
	if err != nil {
		log.Printf("Error reading header: %v", err)
		return nil
	}

	for {
		nameRecord, err := nameBasicsReader.Read()
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

		index[nconst] = person

		if nconst == id {
			return person
		}
	}

	return nil
}
