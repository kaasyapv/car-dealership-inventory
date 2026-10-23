import { DatabaseSync } from "node:sqlite";

/** Opens (and migrates) a SQLite database. Pass a file path in production, ":memory:" in tests only. */
export function openDb(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK (role IN ('admin', 'user'))
    );
    CREATE TABLE IF NOT EXISTS vehicles (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      make     TEXT NOT NULL,
      model    TEXT NOT NULL,
      category TEXT NOT NULL,
      price    REAL NOT NULL CHECK (price >= 0),
      quantity INTEGER NOT NULL CHECK (quantity >= 0)
    );
  `);
  return db;
}
