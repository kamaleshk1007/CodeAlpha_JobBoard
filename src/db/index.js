const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const DEFAULT_DB_PATH = path.join('data', 'jobboard.db');

let db = null;

function initDb(dbPath = process.env.DB_PATH || DEFAULT_DB_PATH) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const database = new DatabaseSync(dbPath);
  database.exec('PRAGMA foreign_keys = ON');
  database.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  db = database;
  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database has not been initialised. Call initDb() first.');
  }
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function transaction(fn) {
  const database = getDb();
  database.exec('BEGIN');
  try {
    const result = fn();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

module.exports = { initDb, getDb, closeDb, transaction };
