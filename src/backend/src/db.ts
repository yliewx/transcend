import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';

let db: Database;

const dbPath = process.env.DB_PATH || './database.sqlite';

export async function setupDbConnection(): Promise<Database> {
  if (db) return db;
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec('PRAGMA foreign_keys = ON;');
 
  const schemaPath = join(__dirname, '..', 'src', 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf8');
  await db.exec(schema);
  
  return db;
}

export async function getDb(): Promise<Database> {
  if (!db) {
    return setupDbConnection();
  }
  return db;
}
