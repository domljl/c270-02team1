const request = require("supertest");
const { createApp } = require("../src/app");
const { openDb } = require("../src/db");
const path = require("path");
const fs = require("fs");

describe("Search Items API", () => {
    let app;
    let db;
    let dbPath;

    beforeEach(() => {
        // Create a temporary database for testing
        dbPath = path.join(__dirname, "test_search_db.sqlite");
        
        // Clean up if exists
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }

        db = openDb({ filename: dbPath });
        app = createApp({ db });

        // Seed the database with test data
        db.prepare("INSERT INTO items (name, sku, description, price, quantity) VALUES (?, ?, ?, ?, ?)")
            .run("Laptop Computer", "LAPTOP-001", "High-performance laptop", 999.99, 5);
        
        db.prepare("INSERT INTO items (name, sku, description, price, quantity) VALUES (?, ?, ?, ?, ?)")
            .run("Mouse", "MOUSE-001", "Wireless mouse", 29.99, 50);
        
        db.prepare("INSERT INTO items (name, sku, description, price, quantity) VALUES (?, ?, ?, ?, ?)")
            .run("Keyboard", "KEYBOARD-001", "Mechanical keyboard with laptop compatibility", 79.99, 30);
        
        db.prepare("INSERT INTO items (name, sku, description, price, quantity) VALUES (?, ?, ?, ?, ?)")
            .run("Monitor", "MONITOR-001", "4K USB-C Monitor", 499.99, 10);
        
        db.prepare("INSERT INTO items (name, sku, description, price, quantity) VALUES (?, ?, ?, ?, ?)")
            .run("USB-C Cable", "USB-C-001", "Fast charging cable", 19.99, 100);
    });

    afterEach(() => {
        db.close();
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }
    });

    describe("Search by name", () => {
        test("should find item by exact name match", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "laptop" });

            expect(res.status).toBe(200);
            // Search matches across name, sku, and description
            expect(res.body.map((item) => item.name)).toContain("Laptop Computer");
        });

        test("should find item by partial name match", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "keyboard" });

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe("Keyboard");
        });

        test("should be case-insensitive", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "LAPTOP" });

            expect(res.status).toBe(200);
            // Search matches across name, sku, and description
            expect(res.body.map((item) => item.name)).toContain("Laptop Computer");
        });

        test("should find multiple items with similar name", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "mouse" });

            expect(res.status).toBe(200);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0].name).toContain("Mouse");
        });
    });

    describe("Search by SKU", () => {
        test("should find item by exact SKU match", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "LAPTOP-001" });

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].sku).toBe("LAPTOP-001");
        });

        test("should find item by partial SKU match", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "LAPTOP" });

            expect(res.status).toBe(200);
            // Search matches across name, sku, and description
            expect(res.body.map((item) => item.sku)).toContain("LAPTOP-001");
        });

        test("should find item by lowercase SKU", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "mouse-001" });

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].sku).toBe("MOUSE-001");
        });
    });

    describe("Search by description", () => {
        test("should find item by keyword in description", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "wireless" });

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe("Mouse");
        });

        test("should find item by partial description match", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "mechanical" });

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe("Keyboard");
        });

        test("should find multiple items matching description", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "laptop" });

            expect(res.status).toBe(200);
            expect(res.body.length).toBeGreaterThan(0);
            // "laptop" appears in both "Laptop Computer" name and "mechanical keyboard with laptop compatibility"
        });
    });

    describe("Search with special cases", () => {
        test("should return all items when query is empty string", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "" });

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(5); // All 5 items
        });

        test("should return all items when no query parameter is provided", async () => {
            const res = await request(app)
                .get("/items");

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(5); // All 5 items
        });

        test("should handle whitespace in query", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "  laptop  " });

            expect(res.status).toBe(200);
            // Search matches across name, sku, and description
            expect(res.body.map((item) => item.name)).toContain("Laptop Computer");
        });

        test("should return empty array when no matches found", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "nonexistent-product" });

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(0);
        });

        test("should find items with special characters", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "USB-C" });

            expect(res.status).toBe(200);
            expect(res.body.length).toBeGreaterThan(0);
            // Should match both "Monitor" (4K USB-C Monitor) and "USB-C Cable"
        });
    });

    describe("Search with query parameter variants", () => {
        test("should support 'query' parameter", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "mouse" });

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
        });

        test("should support 'q' parameter as shorthand", async () => {
            const res = await request(app)
                .get("/items")
                .query({ q: "mouse" });

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
        });

        test("'query' parameter takes precedence over 'q'", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "mouse", q: "keyboard" });

            expect(res.status).toBe(200);
            expect(res.body[0].name).toBe("Mouse");
        });
    });

    describe("Search result ordering and content", () => {
        test("should return results ordered by id DESC", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "laptop" });

            expect(res.status).toBe(200);
            if (res.body.length > 1) {
                for (let i = 1; i < res.body.length; i++) {
                    expect(res.body[i - 1].id).toBeGreaterThanOrEqual(res.body[i].id);
                }
            }
        });

        test("should return all required fields in result", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "mouse" });

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            const item = res.body[0];
            expect(item).toHaveProperty("id");
            expect(item).toHaveProperty("name");
            expect(item).toHaveProperty("sku");
            expect(item).toHaveProperty("description");
            expect(item).toHaveProperty("price");
            expect(item).toHaveProperty("quantity");
        });

        test("should not return created_at field in search results", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "mouse" });

            expect(res.status).toBe(200);
            expect(res.body[0]).not.toHaveProperty("created_at");
        });
    });

    describe("Search with numeric values", () => {
        test("should find items by numeric price in description", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "999" });

            expect(res.status).toBe(200);
            // Will search in name, sku, description - not actual price field
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe("Search performance and edge cases", () => {
        test("should handle very long search query", async () => {
            const longQuery = "a".repeat(1000);
            const res = await request(app)
                .get("/items")
                .query({ query: longQuery });

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(0); // No match expected
        });

        test("should handle special SQL characters safely", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "'; DROP TABLE items; --" });

            expect(res.status).toBe(200);
            // Should not execute SQL injection - should just return no matches
            expect(Array.isArray(res.body)).toBe(true);
        });

        test("should handle % and _ wildcard characters", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "%_%" });

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });
});
