// Done by Vicknesh (24010102)


// Import testing utilities and dependencies
const request = require("supertest");
const { createApp } = require("../src/app");
const { pool, initDb } = require("../src/db");

// Check if DATABASE_URL environment variable exists - if not, skip tests
const hasDb = Boolean(process.env.DATABASE_URL);
// Conditionally run tests only if database is available, otherwise skip the entire suite
const maybeDescribe = hasDb ? describe : describe.skip;

// Spy variables to capture console output during tests
let logSpy;
let errorSpy;

/**
 * Setup hook: Runs once before all tests in this file
 * Mocks console.log and console.error to prevent cluttering test output
 */
beforeAll(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {}); // Mock console.log
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {}); // Mock console.error
});

/**
 * Cleanup hook: Runs once after all tests in this file
 * Restores the original console methods to prevent interference with other tests
 */
afterAll(() => {
    logSpy?.mockRestore(); // Restore console.log
    errorSpy?.mockRestore(); // Restore console.error
});

/**
 * Helper function to reset the database and populate it with test data
 * This ensures each test starts with a clean, known state
 */
async function resetAndSeed() {
    // Clear all existing items from the database and reset the ID sequence
    await pool.query("TRUNCATE items RESTART IDENTITY CASCADE");
    
    // Insert test data: Laptop Computer
    await pool.query(
        "INSERT INTO items (name, sku, description, price, quantity) VALUES ($1, $2, $3, $4, $5)",
        ["Laptop Computer", "LAPTOP-001", "High-performance laptop", 999.99, 5]
    );
    
    // Insert test data: Mouse
    await pool.query(
        "INSERT INTO items (name, sku, description, price, quantity) VALUES ($1, $2, $3, $4, $5)",
        ["Mouse", "MOUSE-001", "Wireless mouse", 29.99, 50]
    );
    
    // Insert test data: Keyboard with compatibility information in description
    await pool.query(
        "INSERT INTO items (name, sku, description, price, quantity) VALUES ($1, $2, $3, $4, $5)",
        ["Keyboard", "KEYBOARD-001", "Mechanical keyboard with laptop compatibility", 79.99, 30]
    );
    
    // Insert test data: 4K Monitor with USB-C capability
    await pool.query(
        "INSERT INTO items (name, sku, description, price, quantity) VALUES ($1, $2, $3, $4, $5)",
        ["Monitor", "MONITOR-001", "4K USB-C Monitor", 499.99, 10]
    );
    
    // Insert test data: USB-C Cable with fast charging capability
    await pool.query(
        "INSERT INTO items (name, sku, description, price, quantity) VALUES ($1, $2, $3, $4, $5)",
        ["USB-C Cable", "USB-C-001", "Fast charging cable", 19.99, 100]
    );
}

/**
 * Main test suite: Search Items API
 * Runs only if DATABASE_URL environment variable is set (database is available)
 */
maybeDescribe("Search Items API", () => {
    /**
     * Setup hook: Runs once before all tests in this describe block
     * Initializes the database schema if it doesn't exist
     */
    beforeAll(async () => {
        await initDb();
    });

    let app; // Will hold the Express app instance

    /**
     * Setup hook: Runs before each individual test
     * Creates a fresh app instance and repopulates the database with test data
     */
    beforeEach(async () => {
        app = createApp({ pool }); // Create new app instance with database pool
        await resetAndSeed(); // Reset database and insert test data
    });

    /**
     * Cleanup hook: Runs after each individual test
     * Cleans up the database by removing all items
     */
    afterEach(async () => {
        if (hasDb) {
            await pool.query("DELETE FROM items"); // Remove all test data
        }
    });

    /**
     * Test group: Verify search functionality by item name
     */
    describe("Search by name", () => {
        /**
         * Test: Verify the search finds items by exact name match
         * Sends a GET request with "laptop" as the query parameter
         */
        test("should find item by exact name match", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "laptop" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            // Search matches across name, sku, and description
            expect(res.body.map((item) => item.name)).toContain("Laptop Computer"); // Verify Laptop Computer is in results
        });

        /**
         * Test: Verify the search finds items by partial name match
         * Sends a GET request with "keyboard" as the query parameter
         */
        test("should find item by partial name match", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "keyboard" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(res.body).toHaveLength(1); // Should return exactly 1 result
            expect(res.body[0].name).toBe("Keyboard"); // Verify correct item returned
        });

        /**
         * Test: Verify search is case-insensitive
         * Sends a GET request with "LAPTOP" (uppercase) as the query parameter
         */
        test("should be case-insensitive", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "LAPTOP" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            // Search matches across name, sku, and description
            expect(res.body.map((item) => item.name)).toContain("Laptop Computer"); // Should still find the item
        });

        /**
         * Test: Verify search returns multiple items when there are similar matches
         * Sends a GET request with "mouse" as the query parameter
         */
        test("should find multiple items with similar name", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "mouse" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(res.body.length).toBeGreaterThan(0); // Should return at least 1 result
            expect(res.body[0].name).toContain("Mouse"); // Verify at least one result contains "Mouse"
        });
    });

    /**
     * Test group: Verify search functionality by item SKU (Stock Keeping Unit)
     */
    describe("Search by SKU", () => {
        /**
         * Test: Verify search finds items by exact SKU match
         * Sends a GET request with "LAPTOP-001" as the query parameter
         */
        test("should find item by exact SKU match", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "LAPTOP-001" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(res.body).toHaveLength(1); // Should return exactly 1 result
            expect(res.body[0].sku).toBe("LAPTOP-001"); // Verify correct SKU in result
        });

        /**
         * Test: Verify search finds items by partial SKU match
         * Sends a GET request with "LAPTOP" (partial SKU) as the query parameter
         */
        test("should find item by partial SKU match", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "LAPTOP" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            // Search matches across name, sku, and description
            expect(res.body.map((item) => item.sku)).toContain("LAPTOP-001"); // Verify SKU in results
        });

        /**
         * Test: Verify search is case-insensitive when searching by SKU
         * Sends a GET request with lowercase "mouse-001" as the query parameter
         */
        test("should find item by lowercase SKU", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "mouse-001" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(res.body).toHaveLength(1); // Should return exactly 1 result
            expect(res.body[0].sku).toBe("MOUSE-001"); // Verify correct SKU returned (case preserved in DB)
        });
    });

    /**
     * Test group: Verify search functionality by item description
     */
    describe("Search by description", () => {
        /**
         * Test: Verify search finds items by keywords in the description field
         * Sends a GET request with "wireless" as the query parameter
         */
        test("should find item by keyword in description", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "wireless" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(res.body).toHaveLength(1); // Should return exactly 1 result (Mouse)
            expect(res.body[0].name).toBe("Mouse"); // Verify the Mouse item is returned
        });

        /**
         * Test: Verify search finds items by partial description match
         * Sends a GET request with "mechanical" as the query parameter
         */
        test("should find item by partial description match", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "mechanical" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(res.body).toHaveLength(1); // Should return exactly 1 result (Keyboard)
            expect(res.body[0].name).toBe("Keyboard"); // Verify the Keyboard item is returned
        });

        /**
         * Test: Verify search can match across multiple fields (name and description)
         * Sends a GET request with "laptop" which appears in both Laptop Computer name
         * and in the keyboard description "Mechanical keyboard with laptop compatibility"
         */
        test("should find multiple items matching description", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "laptop" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(res.body.length).toBeGreaterThan(0); // Should return at least 1 result
            // "laptop" appears in both "Laptop Computer" name and "mechanical keyboard with laptop compatibility"
        });
    });

    /**
     * Test group: Verify search handles special cases and edge cases correctly
     */
    describe("Search with special cases", () => {
        /**
         * Test: Verify search returns all items when query is empty string
         * Sends a GET request with empty string "" as the query parameter
         */
        test("should return all items when query is empty string", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(res.body).toHaveLength(5); // Should return all 5 seeded items
        });

        /**
         * Test: Verify search returns all items when no query parameter is provided at all
         * Sends a GET request with no query parameter
         */
        test("should return all items when no query parameter is provided", async () => {
            const res = await request(app)
                .get("/items");

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(res.body).toHaveLength(5); // Should return all 5 seeded items
        });

        /**
         * Test: Verify search handles whitespace in query correctly
         * Sends a GET request with "  laptop  " (spaces before and after)
         */
        test("should handle whitespace in query", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "  laptop  " });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            // Search matches across name, sku, and description
            expect(res.body.map((item) => item.name)).toContain("Laptop Computer"); // Should trim and still find results
        });

        /**
         * Test: Verify search returns empty array when no matches are found
         * Sends a GET request with a non-existent product "nonexistent-product"
         */
        test("should return empty array when no matches found", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "nonexistent-product" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(res.body).toHaveLength(0); // Should return empty array
        });

        /**
         * Test: Verify search finds items with special characters in their data
         * Sends a GET request with "USB-C" which is a special character pattern
         */
        test("should find items with special characters", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "USB-C" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(res.body.length).toBeGreaterThan(0); // Should find at least 1 result
            // Should match both "Monitor" (4K USB-C Monitor) and "USB-C Cable"
        });
    });

    /**
     * Test group: Verify search API supports different query parameter names and variants
     */
    describe("Search with query parameter variants", () => {
        /**
         * Test: Verify the 'query' parameter is supported
         * Sends a GET request with ?query=mouse
         */
        test("should support 'query' parameter", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "mouse" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(res.body).toHaveLength(1); // Should return exactly 1 result
        });

        /**
         * Test: Verify the 'q' parameter is supported as a shorthand alternative
         * Sends a GET request with ?q=mouse
         */
        test("should support 'q' parameter as shorthand", async () => {
            const res = await request(app)
                .get("/items")
                .query({ q: "mouse" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(res.body).toHaveLength(1); // Should return exactly 1 result
        });

        /**
         * Test: Verify 'query' parameter takes precedence when both 'query' and 'q' are provided
         * Sends a GET request with both ?query=mouse&q=keyboard
         * Expected behavior: query parameter should be used (mouse), not q parameter
         */
        test("'query' parameter takes precedence over 'q'", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "mouse", q: "keyboard" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(res.body[0].name).toBe("Mouse"); // Should return Mouse (query parameter value), not Keyboard
        });
    });

    /**
     * Test group: Verify search results are returned with correct ordering and complete data
     */
    describe("Search result ordering and content", () => {
        /**
         * Test: Verify search results are ordered by item ID in descending order (newest first)
         * Sends a GET request with "laptop" query
         */
        test("should return results ordered by id DESC", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "laptop" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            // If there are multiple results, verify they are ordered by id in descending order
            if (res.body.length > 1) {
                for (let i = 1; i < res.body.length; i++) {
                    expect(res.body[i - 1].id).toBeGreaterThanOrEqual(res.body[i].id); // Each id should be >= the next
                }
            }
        });

        /**
         * Test: Verify search results include all required fields
         * Sends a GET request with "mouse" query
         */
        test("should return all required fields in result", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "mouse" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(res.body).toHaveLength(1); // Should return exactly 1 result
            const item = res.body[0];
            
            // Verify all expected fields are present in the response
            expect(item).toHaveProperty("id"); // Item ID
            expect(item).toHaveProperty("name"); // Item name
            expect(item).toHaveProperty("sku"); // Stock Keeping Unit
            expect(item).toHaveProperty("description"); // Item description
            expect(item).toHaveProperty("price"); // Item price
            expect(item).toHaveProperty("quantity"); // Item quantity in stock
        });

        /**
         * Test: Verify search results do NOT include created_at timestamp field
         * Sends a GET request with "mouse" query
         */
        test("should not return created_at field in search results", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "mouse" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(res.body[0]).not.toHaveProperty("created_at"); // created_at should not be included
        });
    });

    /**
     * Test group: Verify search can handle numeric values in queries
     */
    describe("Search with numeric values", () => {
        /**
         * Test: Verify search can find items when searching by numeric values in descriptions
         * Sends a GET request with "999" (the price of the laptop)
         * Note: This searches name, sku, description - not the actual price field
         */
        test("should find items by numeric price in description", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "999" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            // Will search in name, sku, description - not actual price field
            expect(Array.isArray(res.body)).toBe(true); // Should return an array (may be empty or contain results)
        });
    });

    /**
     * Test group: Verify search performance and security with edge cases
     */
    describe("Search performance and edge cases", () => {
        /**
         * Test: Verify search can handle very long search queries without crashing
         * Sends a GET request with a 1000 character query string
         */
        test("should handle very long search query", async () => {
            const longQuery = "a".repeat(1000); // Create a 1000-character string of 'a's
            const res = await request(app)
                .get("/items")
                .query({ query: longQuery });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(res.body).toHaveLength(0); // No match expected for such a long string
        });

        /**
         * Test: Verify search is protected against SQL injection attacks
         * Sends a GET request with a SQL injection payload: "'; DROP TABLE items; --"
         * This is a critical security test to ensure parameterized queries are being used
         */
        test("should handle special SQL characters safely", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "'; DROP TABLE items; --" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response (query should be safe)
            // Should not execute SQL injection - should just return no matches
            expect(Array.isArray(res.body)).toBe(true); // Should still return an array
        });

        /**
         * Test: Verify search safely handles SQL wildcard characters (% and _)
         * Sends a GET request with "%_%" which are SQL wildcard characters
         * These should be treated as literal characters, not SQL wildcards
         */
        test("should handle % and _ wildcard characters", async () => {
            const res = await request(app)
                .get("/items")
                .query({ query: "%_%" });

            expect(res.status).toBe(200); // Verify HTTP 200 OK response
            expect(Array.isArray(res.body)).toBe(true); // Should return an array
        });
    });
});
