// Done by Dominic (24021835)

// Load environment variables from api/.env for local dev.
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const { Pool } = require("pg");

// Pull connection string from env; fail fast if missing.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is required");
}

// Shared PostgreSQL connection pool with SSL relaxed for managed services.
const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
});

// Ensures the items table exists with basic constraints.
async function initDb() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS items (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            sku TEXT NOT NULL UNIQUE,
            description TEXT,
            price REAL NOT NULL DEFAULT 0 CHECK (price >= 0),
            quantity INTEGER NOT NULL CHECK (quantity >= 0),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
}

module.exports = { pool, initDb };
