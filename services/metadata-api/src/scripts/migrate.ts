import fs from 'fs';
import path from 'path';
import pgPromise from 'pg-promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pgp = pgPromise();
const db = pgp(process.env.DATABASE_URL!);

async function migrate() {
  try {
    // Read migration SQL
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrate.sql'),
      'utf8'
    );

    // Execute migration
    await db.none(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pgp.end();
  }
}

migrate(); 