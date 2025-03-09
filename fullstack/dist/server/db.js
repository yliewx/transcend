"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDbConnection = setupDbConnection;
exports.getDb = getDb;
exports.registerUser = registerUser;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
// import fs from 'fs';
// import path from 'path';
const fs_1 = require("fs");
const path_1 = require("path");
const bcrypt_1 = __importDefault(require("bcrypt"));
let db;
async function setupDbConnection() {
    if (db)
        return db;
    // Open database connection
    db = await (0, sqlite_1.open)({
        filename: './database.sqlite',
        driver: sqlite3_1.default.Database
    });
    // Initialize database schema
    //const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const schemaPath = (0, path_1.join)(__dirname, '..', '..', 'src', 'server', 'schema.sql');
    const schema = (0, fs_1.readFileSync)(schemaPath, 'utf8');
    await db.exec(schema);
    return db;
}
async function getDb() {
    if (!db) {
        return setupDbConnection();
    }
    return db;
}
// User registration
async function registerUser(username, password, email) {
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
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    // Insert user
    return db.run('INSERT INTO users (username, password, email, created_at) VALUES (?, ?, ?, ?)', username, hashedPassword, email, new Date().toISOString());
}
//# sourceMappingURL=db.js.map