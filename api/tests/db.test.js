const { openDb, createDbFromEnv } = require("../src/db");
const path = require("path");
const fs = require("fs");

describe("Database", () => {
    describe("openDb", () => {
        test("creates in-memory database successfully", () => {
            const db = openDb({ filename: ":memory:" });
            expect(db).toBeDefined();
            
            const result = db.prepare("SELECT 1 as value").get();
            expect(result.value).toBe(1);
            
            db.close();
        });

        test("creates items table with correct schema", () => {
            const db = openDb({ filename: ":memory:" });
            
            const tableInfo = db.prepare("PRAGMA table_info(items)").all();
            const columnNames = tableInfo.map((col) => col.name);
            
            expect(columnNames).toContain("id");
            expect(columnNames).toContain("name");
            expect(columnNames).toContain("sku");
            expect(columnNames).toContain("quantity");
            expect(columnNames).toContain("created_at");
            
            db.close();
        });

        test("enforces unique constraint on sku", () => {
            const db = openDb({ filename: ":memory:" });
            
            db.prepare("INSERT INTO items (name, sku, quantity) VALUES (?, ?, ?)").run(
                "Item 1",
                "SKU-001",
                10
            );
            
            expect(() => {
                db.prepare("INSERT INTO items (name, sku, quantity) VALUES (?, ?, ?)").run(
                    "Item 2",
                    "SKU-001",
                    20
                );
            }).toThrow();
            
            db.close();
        });

        test("enforces non-negative quantity constraint", () => {
            const db = openDb({ filename: ":memory:" });
            
            expect(() => {
                db.prepare("INSERT INTO items (name, sku, quantity) VALUES (?, ?, ?)").run(
                    "Item",
                    "SKU-001",
                    -1
                );
            }).toThrow();
            
            db.close();
        });

        test("allows quantity of zero", () => {
            const db = openDb({ filename: ":memory:" });
            
            const result = db
                .prepare("INSERT INTO items (name, sku, quantity) VALUES (?, ?, ?)")
                .run("Item", "SKU-001", 0);
            
            expect(result.changes).toBe(1);
            
            const item = db.prepare("SELECT * FROM items WHERE id = ?").get(result.lastInsertRowid);
            expect(item.quantity).toBe(0);
            
            db.close();
        });

        test("auto-generates created_at timestamp", () => {
            const db = openDb({ filename: ":memory:" });
            
            const result = db
                .prepare("INSERT INTO items (name, sku, quantity) VALUES (?, ?, ?)")
                .run("Item", "SKU-001", 10);
            
            const item = db.prepare("SELECT * FROM items WHERE id = ?").get(result.lastInsertRowid);
            expect(item.created_at).toBeTruthy();
            expect(new Date(item.created_at)).toBeInstanceOf(Date);
            
            db.close();
        });

        test("enables WAL mode for file-backed databases", () => {
            const tempPath = path.join(__dirname, "wal-mode-test.db");
            try {
                const db = openDb({ filename: tempPath });
                const journalMode = db.pragma("journal_mode", { simple: true });
                expect(journalMode.toLowerCase()).toBe("wal");
                db.close();
            } finally {
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                const shmFile = tempPath + "-shm";
                const walFile = tempPath + "-wal";
                if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
                if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
            }
        });
    });

    describe("createDbFromEnv", () => {
        test("uses DB_FILE environment variable when set", () => {
            const tempPath = path.join(__dirname, "temp-test.db");
            const originalEnv = process.env.DB_FILE;
            
            try {
                process.env.DB_FILE = tempPath;
                const db = createDbFromEnv();
                
                expect(db).toBeDefined();
                expect(fs.existsSync(tempPath)).toBe(true);
                
                db.close();
            } finally {
                process.env.DB_FILE = originalEnv;
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
                const shmFile = tempPath + "-shm";
                const walFile = tempPath + "-wal";
                if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
                if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
            }
        });

        test("uses default path when DB_FILE not set", () => {
            const originalEnv = process.env.DB_FILE;
            const expectedPath = path.join(process.cwd(), "data", "inventory.sqlite");
            
            try {
                delete process.env.DB_FILE;
                
                // Create the data directory if it doesn't exist
                const dataDir = path.join(process.cwd(), "data");
                if (!fs.existsSync(dataDir)) {
                    fs.mkdirSync(dataDir, { recursive: true });
                }
                
                const db = createDbFromEnv();
                expect(db).toBeDefined();
                db.close();
                
                // Note: We don't delete the default DB as it might be used by the app
            } finally {
                process.env.DB_FILE = originalEnv;
            }
        });
    });

    describe("Data Persistence", () => {
        test("persists data across connections", () => {
            const tempPath = path.join(__dirname, "persistence-test.db");
            
            try {
                // Create and insert data
                let db = openDb({ filename: tempPath });
                db.prepare("INSERT INTO items (name, sku, quantity) VALUES (?, ?, ?)").run(
                    "Test Item",
                    "TEST-001",
                    10
                );
                db.close();
                
                // Reopen and verify data
                db = openDb({ filename: tempPath });
                const items = db.prepare("SELECT * FROM items").all();
                expect(items.length).toBe(1);
                expect(items[0].name).toBe("Test Item");
                expect(items[0].sku).toBe("TEST-001");
                expect(items[0].quantity).toBe(10);
                db.close();
            } finally {
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                const shmFile = tempPath + "-shm";
                const walFile = tempPath + "-wal";
                if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
                if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
            }
        });
    });
});
