// Done by Dominic (24021835)

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
});

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
