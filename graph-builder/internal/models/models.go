package models

type Title struct {
	ID        string
	Type      string
	Title     string
	StartYear int
	EndYear   int
}

type Person struct {
	ID          string
	PrimaryName string
	BirthYear   int
	DeathYear   int
}
