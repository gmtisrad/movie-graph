package main

import (
	"bufio"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

// Data models
type TitleBasics struct {
	Tconst        string   `json:"tconst"`
	TitleType     string   `json:"titleType"`
	PrimaryTitle  string   `json:"primaryTitle"`
	OriginalTitle string   `json:"originalTitle"`
	IsAdult       bool     `json:"isAdult"`
	StartYear     *int     `json:"startYear"`
	EndYear       *int     `json:"endYear"`
	RuntimeMins   *int     `json:"runtimeMinutes"`
	Genres        []string `json:"genres"`
}

type NameBasics struct {
	Nconst           string   `json:"nconst"`
	PrimaryName      string   `json:"primaryName"`
	BirthYear        *int     `json:"birthYear"`
	DeathYear        *int     `json:"deathYear"`
	PrimaryProfession []string `json:"primaryProfession"`
	KnownForTitles   []string `json:"knownForTitles"`
}

type TitleCrew struct {
	Tconst    string   `json:"tconst"`
	Directors []string `json:"directors"`
	Writers   []string `json:"writers"`
}

type TitlePrincipals struct {
	Tconst     string    `json:"tconst"`
	Ordering   int       `json:"ordering"`
	Nconst     string    `json:"nconst"`
	Category   string    `json:"category"`
	Job        *string   `json:"job"`
	Characters []string  `json:"characters"`
}

const batchSize = 5000

func parseNullableInt(s string) *int {
	if s == "\\N" {
		return nil
	}
	i, err := strconv.Atoi(s)
	if err != nil {
		return nil
	}
	return &i
}

func parseStringArray(s string) []string {
	if s == "\\N" {
		return []string{}
	}
	return strings.Split(s, ",")
}

func loadTitleBasics(db *pgxpool.Pool, filePath string, wg *sync.WaitGroup) {
	defer wg.Done()
	start := time.Now()
	log.Printf("Loading title.basics.tsv...")

	file, err := os.Open(filePath)
	if err != nil {
		log.Fatalf("Error opening file: %v", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	scanner.Scan() // Skip header

	batch := make([]TitleBasics, 0, batchSize)
	count := 0

	for scanner.Scan() {
		fields := strings.Split(scanner.Text(), "\t")
		if len(fields) != 9 {
			continue
		}

		title := TitleBasics{
			Tconst:        fields[0],
			TitleType:     fields[1],
			PrimaryTitle:  fields[2],
			OriginalTitle: fields[3],
			IsAdult:       fields[4] == "1",
			StartYear:     parseNullableInt(fields[5]),
			EndYear:       parseNullableInt(fields[6]),
			RuntimeMins:   parseNullableInt(fields[7]),
			Genres:        parseStringArray(fields[8]),
		}
		batch = append(batch, title)

		if len(batch) >= batchSize {
			if err := insertTitleBatch(db, batch); err != nil {
				log.Printf("Error inserting batch: %v", err)
			}
			count += len(batch)
			log.Printf("Inserted %d movies...", count)
			batch = make([]TitleBasics, 0, batchSize)
		}
	}

	if len(batch) > 0 {
		if err := insertTitleBatch(db, batch); err != nil {
			log.Printf("Error inserting final batch: %v", err)
		}
		count += len(batch)
	}

	log.Printf("Finished loading %d movies in %v", count, time.Since(start))
}

func loadNameBasics(db *pgxpool.Pool, filePath string, wg *sync.WaitGroup) {
	defer wg.Done()
	start := time.Now()
	log.Printf("Loading name.basics.tsv...")

	file, err := os.Open(filePath)
	if err != nil {
		log.Fatalf("Error opening file: %v", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	scanner.Scan() // Skip header

	batch := make([]NameBasics, 0, batchSize)
	count := 0

	for scanner.Scan() {
		fields := strings.Split(scanner.Text(), "\t")
		if len(fields) != 6 {
			continue
		}

		person := NameBasics{
			Nconst:           fields[0],
			PrimaryName:      fields[1],
			BirthYear:        parseNullableInt(fields[2]),
			DeathYear:        parseNullableInt(fields[3]),
			PrimaryProfession: parseStringArray(fields[4]),
			KnownForTitles:   parseStringArray(fields[5]),
		}
		batch = append(batch, person)

		if len(batch) >= batchSize {
			if err := insertNameBatch(db, batch); err != nil {
				log.Printf("Error inserting batch: %v", err)
			}
			count += len(batch)
			log.Printf("Inserted %d people...", count)
			batch = make([]NameBasics, 0, batchSize)
		}
	}

	if len(batch) > 0 {
		if err := insertNameBatch(db, batch); err != nil {
			log.Printf("Error inserting final batch: %v", err)
		}
		count += len(batch)
	}

	log.Printf("Finished loading %d people in %v", count, time.Since(start))
}

func loadTitleCrew(db *pgxpool.Pool, filePath string, wg *sync.WaitGroup) {
	defer wg.Done()
	start := time.Now()
	log.Printf("Loading title.crew.tsv...")

	file, err := os.Open(filePath)
	if err != nil {
		log.Fatalf("Error opening file: %v", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	scanner.Scan() // Skip header

	batch := make([]TitleCrew, 0, batchSize)
	count := 0

	for scanner.Scan() {
		fields := strings.Split(scanner.Text(), "\t")
		if len(fields) != 3 {
			continue
		}

		crew := TitleCrew{
			Tconst:    fields[0],
			Directors: parseStringArray(fields[1]),
			Writers:   parseStringArray(fields[2]),
		}
		batch = append(batch, crew)

		if len(batch) >= batchSize {
			if err := insertCrewBatch(db, batch); err != nil {
				log.Printf("Error inserting batch: %v", err)
			}
			count += len(batch)
			log.Printf("Inserted %d movie crews...", count)
			batch = make([]TitleCrew, 0, batchSize)
		}
	}

	if len(batch) > 0 {
		if err := insertCrewBatch(db, batch); err != nil {
			log.Printf("Error inserting final batch: %v", err)
		}
		count += len(batch)
	}

	log.Printf("Finished loading %d movie crews in %v", count, time.Since(start))
}

func loadTitlePrincipals(db *pgxpool.Pool, filePath string, wg *sync.WaitGroup) {
	defer wg.Done()
	start := time.Now()
	log.Printf("Loading title.principals.tsv...")

	file, err := os.Open(filePath)
	if err != nil {
		log.Fatalf("Error opening file: %v", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	scanner.Scan() // Skip header

	batch := make([]TitlePrincipals, 0, batchSize)
	count := 0

	for scanner.Scan() {
		fields := strings.Split(scanner.Text(), "\t")
		if len(fields) != 6 {
			continue
		}

		ordering, _ := strconv.Atoi(fields[1])
		var job *string
		if fields[4] != "\\N" {
			j := fields[4]
			job = &j
		}

		var characters []string
		if fields[5] != "\\N" {
			if err := json.Unmarshal([]byte(fields[5]), &characters); err != nil {
				characters = []string{}
			}
		}

		principal := TitlePrincipals{
			Tconst:     fields[0],
			Ordering:   ordering,
			Nconst:     fields[2],
			Category:   fields[3],
			Job:        job,
			Characters: characters,
		}
		batch = append(batch, principal)

		if len(batch) >= batchSize {
			if err := insertPrincipalsBatch(db, batch); err != nil {
				log.Printf("Error inserting batch: %v", err)
			}
			count += len(batch)
			log.Printf("Inserted %d movie principals...", count)
			batch = make([]TitlePrincipals, 0, batchSize)
		}
	}

	if len(batch) > 0 {
		if err := insertPrincipalsBatch(db, batch); err != nil {
			log.Printf("Error inserting final batch: %v", err)
		}
		count += len(batch)
	}

	log.Printf("Finished loading %d movie principals in %v", count, time.Since(start))
}

func insertTitleBatch(db *pgxpool.Pool, batch []TitleBasics) error {
	_, err := db.CopyFrom(
		context.Background(),
		pgx.Identifier{"movies"},
		[]string{"id", "title_type", "primary_title", "original_title", "is_adult", "start_year", "end_year", "runtime_minutes", "genres"},
		pgx.CopyFromSlice(len(batch), func(i int) ([]interface{}, error) {
			return []interface{}{
				batch[i].Tconst,
				batch[i].TitleType,
				batch[i].PrimaryTitle,
				batch[i].OriginalTitle,
				batch[i].IsAdult,
				batch[i].StartYear,
				batch[i].EndYear,
				batch[i].RuntimeMins,
				batch[i].Genres,
			}, nil
		}),
	)
	return err
}

func insertNameBatch(db *pgxpool.Pool, batch []NameBasics) error {
	_, err := db.CopyFrom(
		context.Background(),
		pgx.Identifier{"people"},
		[]string{"id", "primary_name", "birth_year", "death_year", "primary_professions", "known_for_titles"},
		pgx.CopyFromSlice(len(batch), func(i int) ([]interface{}, error) {
			return []interface{}{
				batch[i].Nconst,
				batch[i].PrimaryName,
				batch[i].BirthYear,
				batch[i].DeathYear,
				batch[i].PrimaryProfession,
				batch[i].KnownForTitles,
			}, nil
		}),
	)
	return err
}

func insertCrewBatch(db *pgxpool.Pool, batch []TitleCrew) error {
	_, err := db.CopyFrom(
		context.Background(),
		pgx.Identifier{"movie_crew"},
		[]string{"movie_id", "director_ids", "writer_ids"},
		pgx.CopyFromSlice(len(batch), func(i int) ([]interface{}, error) {
			return []interface{}{
				batch[i].Tconst,
				batch[i].Directors,
				batch[i].Writers,
			}, nil
		}),
	)
	return err
}

func insertPrincipalsBatch(db *pgxpool.Pool, batch []TitlePrincipals) error {
	_, err := db.CopyFrom(
		context.Background(),
		pgx.Identifier{"movie_principals"},
		[]string{"movie_id", "person_id", "ordering", "category", "job", "characters"},
		pgx.CopyFromSlice(len(batch), func(i int) ([]interface{}, error) {
			return []interface{}{
				batch[i].Tconst,
				batch[i].Nconst,
				batch[i].Ordering,
				batch[i].Category,
				batch[i].Job,
				batch[i].Characters,
			}, nil
		}),
	)
	return err
}

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	// Parse command line arguments
	dataDir := flag.String("data", "", "Directory containing IMDb TSV files")
	flag.Parse()

	if *dataDir == "" {
		log.Fatal("Please provide the data directory using -data flag")
	}

	// Connect to database
	dbpool, err := pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer dbpool.Close()

	// Use WaitGroup to load files concurrently
	var wg sync.WaitGroup
	wg.Add(4)

	// Start loading each file in parallel
	go loadTitleBasics(dbpool, filepath.Join(*dataDir, "title.basics.tsv"), &wg)
	go loadNameBasics(dbpool, filepath.Join(*dataDir, "name.basics.tsv"), &wg)
	go loadTitleCrew(dbpool, filepath.Join(*dataDir, "title.crew.tsv"), &wg)
	go loadTitlePrincipals(dbpool, filepath.Join(*dataDir, "title.principals.tsv"), &wg)

	// Wait for all loaders to complete
	wg.Wait()
	fmt.Println("Data loading completed successfully")
} 