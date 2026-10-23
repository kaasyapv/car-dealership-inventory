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
    CREATE TABLE IF NOT EXISTS inventory_events (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id    INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
      vehicle_label TEXT NOT NULL,
      user_id       INTEGER NOT NULL REFERENCES users(id),
      kind          TEXT NOT NULL CHECK (kind IN ('purchase', 'restock')),
      quantity      INTEGER NOT NULL CHECK (quantity > 0),
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);
  return db;
}
