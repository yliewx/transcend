import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
// import fs from 'fs';
// import path from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';
import bcrypt from 'bcrypt';

let db: Database;

export async function setupDbConnection(): Promise<Database> {
  if (db) return db;
  
  // Open database connection
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });
  
  // Initialize database schema
  //const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const schemaPath = join(__dirname, '..', '..', 'src', 'server', 'schema.sql');
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

// User registration
export async function registerUser(username: string, password: string, email: string) {
  const db = await getDb();
  
  // Check if username already exists
  const existingUser = await db.get('SELECT username FROM users WHERE username = ?', username);
  if (existingUser) {
    throw new Error('Username already exists');
  }
  
  // Check if email already exists
  const existingEmail = await db.get('SELECT email FROM users WHERE email = ?', email);
  if (existingEmail) {
    throw new Error('Email already exists');
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Insert user
  // return db.run(
  //   'INSERT INTO users (username, password, email, created_at) VALUES (?, ?, ?, ?)',
  //   username, hashedPassword, email, new Date().toISOString()
  // );
  db.run(
    'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
    username, hashedPassword, email
  );
}
