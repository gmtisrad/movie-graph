package importer

import (
	"encoding/csv"
	"movie-graph/internal/graph"
	"movie-graph/internal/models"
	"os"
)

func GenerateGraphFromFiles() *graph.Graph {
	principalsFile, err := os.Open("./data/title.principals.tsv")
	if err != nil {
		panic(err)
	}
	defer principalsFile.Close()

	nameBasicsFile, err := os.Open("./data/name.basics.tsv")
	if err != nil {
		panic(err)
	}
	defer nameBasicsFile.Close()

	titleBasicsFile, err := os.Open("./data/title.basics.tsv")
	if err != nil {
		panic(err)
	}
	defer titleBasicsFile.Close()

	principalsReader := csv.NewReader(principalsFile)
	principalsReader.Comma = '\t'

	nameBasicsReader := csv.NewReader(nameBasicsFile)
	nameBasicsReader.Comma = '\t'

	var index map[string]graph.Node = make(map[string]graph.Node)

	for principalRecord, err := principalsReader.Read(); principalRecord != nil; principalRecord, err = principalsReader.Read() {
		if err != nil {
			panic(err)
		}

		tconst, nconst := principalRecord[0], principalRecord[2]

		title := &models.Title{
			ID: tconst,
		}

		person := &models.Person{
			ID: nconst,
		}

		
	}

	// TODO: Return the created graph
	return graph.CreateGraph()
}