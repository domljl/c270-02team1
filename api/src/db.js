const path = require("path");
const Database = require("better-sqlite3");

function openDb({ filename }) {
    const db = new Database(filename);
    db.pragma("journal_mode = WAL");

    db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      quantity INTEGER NOT NULL CHECK (quantity >= 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

    return db;
}

function createDbFromEnv() {
    const dbFile = process.env.DB_FILE || path.join(process.cwd(), "data", "inventory.sqlite");

    return openDb({ filename: dbFile });
}

module.exports = { openDb, createDbFromEnv };
