import fs from 'fs';
import path from 'path';
import readline from 'readline';
import pgPromise from 'pg-promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pgp = pgPromise();
const db = pgp(process.env.DATABASE_URL!);

interface TitleBasics {
  tconst: string;
  titleType: string;
  primaryTitle: string;
  originalTitle: string;
  isAdult: boolean;
  startYear: number | null;
  endYear: number | null;
  runtimeMinutes: number | null;
  genres: string[];
}

interface NameBasics {
  nconst: string;
  primaryName: string;
  birthYear: number | null;
  deathYear: number | null;
  primaryProfession: string[];
  knownForTitles: string[];
}

interface TitleCrew {
  tconst: string;
  directors: string[];
  writers: string[];
}

interface TitlePrincipals {
  tconst: string;
  ordering: number;
  nconst: string;
  category: string;
  job: string | null;
  characters: string[] | null;
}

async function* readTSVFile<T>(filePath: string, transform: (fields: string[]) => T | null): AsyncGenerator<T> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isFirstLine = true;
  for await (const line of rl) {
    if (isFirstLine) {
      isFirstLine = false;
      continue;
    }

    const fields = line.split('\t');
    const record = transform(fields);
    if (record) {
      yield record;
    }
  }
}

async function loadTitleBasics(filePath: string) {
  console.log('Loading title.basics.tsv...');
  const transform = (fields: string[]): TitleBasics | null => {
    const [tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres] = fields;
    return {
      tconst,
      titleType,
      primaryTitle,
      originalTitle,
      isAdult: isAdult === '1',
      startYear: startYear !== '\\N' ? parseInt(startYear) : null,
      endYear: endYear !== '\\N' ? parseInt(endYear) : null,
      runtimeMinutes: runtimeMinutes !== '\\N' ? parseInt(runtimeMinutes) : null,
      genres: genres !== '\\N' ? genres.split(',') : []
    };
  };

  const cs = new pgp.helpers.ColumnSet(
    ['id', 'title_type', 'primary_title', 'original_title', 'is_adult', 'start_year', 'end_year', 'runtime_minutes', 'genres'],
    { table: 'movies' }
  );

  let batch: any[] = [];
  let count = 0;
  const BATCH_SIZE = 1000;

  for await (const record of readTSVFile(filePath, transform)) {
    batch.push({
      id: record.tconst,
      title_type: record.titleType,
      primary_title: record.primaryTitle,
      original_title: record.originalTitle,
      is_adult: record.isAdult,
      start_year: record.startYear,
      end_year: record.endYear,
      runtime_minutes: record.runtimeMinutes,
      genres: record.genres
    });

    if (batch.length === BATCH_SIZE) {
      await db.none(pgp.helpers.insert(batch, cs));
      count += batch.length;
      console.log(`Inserted ${count} movies...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await db.none(pgp.helpers.insert(batch, cs));
    count += batch.length;
  }

  console.log(`Finished loading ${count} movies`);
}

async function loadNameBasics(filePath: string) {
  console.log('Loading name.basics.tsv...');
  const transform = (fields: string[]): NameBasics | null => {
    const [nconst, primaryName, birthYear, deathYear, primaryProfession, knownForTitles] = fields;
    return {
      nconst,
      primaryName,
      birthYear: birthYear !== '\\N' ? parseInt(birthYear) : null,
      deathYear: deathYear !== '\\N' ? parseInt(deathYear) : null,
      primaryProfession: primaryProfession !== '\\N' ? primaryProfession.split(',') : [],
      knownForTitles: knownForTitles !== '\\N' ? knownForTitles.split(',') : []
    };
  };

  const cs = new pgp.helpers.ColumnSet(
    ['id', 'primary_name', 'birth_year', 'death_year', 'primary_professions', 'known_for_titles'],
    { table: 'people' }
  );

  let batch: any[] = [];
  let count = 0;
  const BATCH_SIZE = 1000;

  for await (const record of readTSVFile(filePath, transform)) {
    batch.push({
      id: record.nconst,
      primary_name: record.primaryName,
      birth_year: record.birthYear,
      death_year: record.deathYear,
      primary_professions: record.primaryProfession,
      known_for_titles: record.knownForTitles
    });

    if (batch.length === BATCH_SIZE) {
      await db.none(pgp.helpers.insert(batch, cs));
      count += batch.length;
      console.log(`Inserted ${count} people...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await db.none(pgp.helpers.insert(batch, cs));
    count += batch.length;
  }

  console.log(`Finished loading ${count} people`);
}

async function loadTitleCrew(filePath: string) {
  console.log('Loading title.crew.tsv...');
  const transform = (fields: string[]): TitleCrew | null => {
    const [tconst, directors, writers] = fields;
    return {
      tconst,
      directors: directors !== '\\N' ? directors.split(',') : [],
      writers: writers !== '\\N' ? writers.split(',') : []
    };
  };

  const cs = new pgp.helpers.ColumnSet(
    ['movie_id', 'director_ids', 'writer_ids'],
    { table: 'movie_crew' }
  );

  let batch: any[] = [];
  let count = 0;
  const BATCH_SIZE = 1000;

  for await (const record of readTSVFile(filePath, transform)) {
    batch.push({
      movie_id: record.tconst,
      director_ids: record.directors,
      writer_ids: record.writers
    });

    if (batch.length === BATCH_SIZE) {
      await db.none(pgp.helpers.insert(batch, cs));
      count += batch.length;
      console.log(`Inserted ${count} movie crews...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await db.none(pgp.helpers.insert(batch, cs));
    count += batch.length;
  }

  console.log(`Finished loading ${count} movie crews`);
}

async function loadTitlePrincipals(filePath: string) {
  console.log('Loading title.principals.tsv...');
  const transform = (fields: string[]): TitlePrincipals | null => {
    const [tconst, ordering, nconst, category, job, characters] = fields;
    return {
      tconst,
      ordering: parseInt(ordering),
      nconst,
      category,
      job: job !== '\\N' ? job : null,
      characters: characters !== '\\N' ? JSON.parse(characters) : null
    };
  };

  const cs = new pgp.helpers.ColumnSet(
    ['movie_id', 'person_id', 'ordering', 'category', 'job', 'characters'],
    { table: 'movie_principals' }
  );

  let batch: any[] = [];
  let count = 0;
  const BATCH_SIZE = 1000;

  for await (const record of readTSVFile(filePath, transform)) {
    batch.push({
      movie_id: record.tconst,
      person_id: record.nconst,
      ordering: record.ordering,
      category: record.category,
      job: record.job,
      characters: record.characters
    });

    if (batch.length === BATCH_SIZE) {
      await db.none(pgp.helpers.insert(batch, cs));
      count += batch.length;
      console.log(`Inserted ${count} movie principals...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await db.none(pgp.helpers.insert(batch, cs));
    count += batch.length;
  }

  console.log(`Finished loading ${count} movie principals`);
}

async function loadData(dataDir: string) {
  try {
    await loadTitleBasics(path.join(dataDir, 'title.basics.tsv'));
    await loadNameBasics(path.join(dataDir, 'name.basics.tsv'));
    await loadTitleCrew(path.join(dataDir, 'title.crew.tsv'));
    await loadTitlePrincipals(path.join(dataDir, 'title.principals.tsv'));
    console.log('Data loading completed successfully');
  } catch (error) {
    console.error('Error loading data:', error);
    process.exit(1);
  } finally {
    await pgp.end();
  }
}

// Get data directory from command line argument
const dataDir = process.argv[2];
if (!dataDir) {
  console.error('Please provide the data directory path as an argument');
  process.exit(1);
}

loadData(dataDir); 