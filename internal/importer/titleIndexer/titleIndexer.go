package titleIndexer

import (
	"encoding/csv"
	"os"
)

var index map[string][]string = make(map[string][]string)

func Find(id string) []string {
	// Reads file title.basics.tsv into a reader and then reads the file line by line
	titleBasicsFile, err := os.Open("./data/title.basics.tsv")
	if err != nil {
		panic(err)
	}
	defer titleBasicsFile.Close()

	titleBasicsReader := csv.NewReader(titleBasicsFile)
	titleBasicsReader.Comma = '\t'
}
