package titleIndexer

import (
	"encoding/csv"
	"io"
	"log"
	"movie-graph/internal/models"
	"os"
	"strconv"
)

var index map[string]*models.Title = make(map[string]*models.Title)

func Find(id string) *models.Title {
	// Check if the title is already in the index
	if title, ok := index[id]; ok {
		return title
	}

	// Reads file title.basics.tsv into a reader and then reads the file line by line
	titleBasicsFile, err := os.Open("./data/title.basics.tsv")
	if err != nil {
		panic(err)
	}
	defer titleBasicsFile.Close()

	titleBasicsReader := csv.NewReader(titleBasicsFile)
	titleBasicsReader.Comma = '\t'
	titleBasicsReader.LazyQuotes = true
	titleBasicsReader.FieldsPerRecord = -1

	// Throw away the first line, headers
	titleBasicsReader.Read()

	for titleRecord, err := titleBasicsReader.Read(); titleRecord != nil; titleRecord, err = titleBasicsReader.Read() {
		if err == io.EOF {
			break
		}
		if err != nil {
			// Log the error and continue
			log.Printf("Error reading record: %v", err)
			continue
		}

		// Ensure we have at least 4 fields
		if len(titleRecord) < 4 {
			log.Printf("Skipping record with insufficient fields: %v", titleRecord)
			continue
		}

		titleID, titleType, title, startYear, endYear := titleRecord[0], titleRecord[1], titleRecord[2], titleRecord[5], titleRecord[6]

		startYearInt, err := strconv.Atoi(startYear)
		if err != nil {
			startYearInt = -1
		}

		endYearInt, err := strconv.Atoi(endYear)
		if err != nil {
			endYearInt = -1
		}

		index[titleID] = &models.Title{
			ID: titleID,
			Type: titleType,
			Title: title,
			StartYear: startYearInt,
			EndYear:   endYearInt,
		}

		if titleID == id {
			return index[titleID]
		}
	}
	index[id] = nil
	return nil
}
