const request = require("supertest");
const { pool, initDb } = require("../src/db");
const { createApp } = require("../src/app");

const hasDb = Boolean(process.env.DATABASE_URL);
const maybeDescribe = hasDb ? describe : describe.skip;

let logSpy;
let errorSpy;

// Setup: Mock console.log and console.error to avoid cluttering test output
beforeAll(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

// Cleanup: Restore original console methods after all tests finish
afterAll(() => {
    logSpy?.mockRestore();
    errorSpy?.mockRestore();
});

// Helper function: Clears all items from the database before each test
// This ensures each test starts with a clean slate
async function resetTable() {
    await pool.query("TRUNCATE items RESTART IDENTITY CASCADE");
}

// Helper function: Creates a test app instance with database connection
function makeTestApp() {
    const app = createApp({ pool });
    return { app, db: pool };
}

maybeDescribe("Edit Item Feature", () => {
    // Setup: Initialize database schema before running any tests
    beforeAll(async () => {
        await initDb();
    });

    // Cleanup: Clear all items before each test to ensure isolation
    beforeEach(async () => {
        await resetTable();
    });
    
    // -------------------
    // POST /editItem/:id
    // -------------------
    describe("POST /editItem/:id", () => {
        /**
         * Test Case 1: Successful item update
         * Purpose: Verify that an item's details can be successfully updated
         * Steps:
         *   1. Create a new item with initial values
         *   2. Send a POST request to update the item with new values
         *   3. Verify the response status is 200 (OK)
         *   4. Verify the updated values are returned correctly
         * Expected Result: All fields should be updated with the new values
         */
        test("✅ updates item successfully", async () => {
            const { app } = makeTestApp();

            // Add item first
            await request(app).post("/addItem").send({ name: "Mouse", quantity: 5 });
            const { rows } = await pool.query("SELECT id FROM items LIMIT 1");
            const id = rows[0].id;

            // Edit item
            const res = await request(app).post(`/editItem/${id}`).send({
                name: "Gaming Mouse",
                price: 49.99,
                quantity: 10,
            });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe("Gaming Mouse");
            expect(res.body.price).toBe(49.99);
            expect(res.body.quantity).toBe(10);
        });

        /**
         * Test Case 2: Error handling for non-existent item
         * Purpose: Verify that attempting to edit a non-existent item returns 404 error
         * Steps:
         *   1. Send a POST request to update an item with ID that doesn't exist (999)
         *   2. Verify the response status is 404 (Not Found)
         *   3. Verify an appropriate error message is returned
         * Expected Result: Server should return 404 with "Item not found" error message
         */
        test("❌ returns 404 for non-existent item", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/editItem/999").send({
                name: "Ghost Item",
                price: 10,
                quantity: 1,
            });

            expect(res.status).toBe(404);
            expect(res.body.error).toContain("Item not found");
        });

        /**
         * Test Case 3: Validation for negative quantity
         * Purpose: Verify that attempting to update an item with negative quantity is rejected
         * Steps:
         *   1. Create a new item with a valid quantity
         *   2. Send a POST request to update the item with a negative quantity (-5)
         *   3. Verify the response status is 400 (Bad Request)
         *   4. Verify an appropriate validation error message is returned
         * Expected Result: Server should return 400 with quantity validation error message
         */
        test("❌ returns 400 for invalid quantity", async () => {
            const { app } = makeTestApp();

            await request(app).post("/addItem").send({ name: "Keyboard", quantity: 5 });
            const { rows } = await pool.query("SELECT id FROM items LIMIT 1");
            const id = rows[0].id;

            const res = await request(app).post(`/editItem/${id}`).send({ quantity: -5 });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain("quantity must be a non-negative integer");
        });
    });

    // -------------------
    // GET /items/:id
    // -------------------
    describe("GET /items/:id", () => {
        /**
         * Test Case 4: Successfully retrieve a single item
         * Purpose: Verify that retrieving a specific item by ID returns the correct data
         * Steps:
         *   1. Create a new item with known values (name, quantity, price)
         *   2. Send a GET request to fetch the item by its ID
         *   3. Verify the response status is 200 (OK)
         *   4. Verify all item details in the response match the created item
         * Expected Result: Server should return the item with all correct field values
         */
        test("✅ returns item successfully", async () => {
            const { app } = makeTestApp();

            await request(app).post("/addItem").send({
                name: "Monitor",
                quantity: 2,
                price: 199.99,
            });
            const { rows } = await pool.query("SELECT id FROM items LIMIT 1");
            const id = rows[0].id;

            const res = await request(app).get(`/items/${id}`);

            expect(res.status).toBe(200);
            expect(res.body.name).toBe("Monitor");
            expect(res.body.price).toBe(199.99);
            expect(res.body.quantity).toBe(2);
        });

        /**
         * Test Case 5: Error handling for invalid ID format
         * Purpose: Verify that requesting an item with an invalid ID format returns 400 error
         * Steps:
         *   1. Send a GET request with a non-numeric ID (e.g., "abc")
         *   2. Verify the response status is 400 (Bad Request)
         *   3. Verify an appropriate error message is returned
         * Expected Result: Server should return 400 with "invalid id" error message
         */
        test("❌ returns 400 for invalid id format", async () => {
            const { app } = makeTestApp();

            const res = await request(app).get("/items/abc");

            expect(res.status).toBe(400);
            expect(res.body.error).toContain("invalid id");
        });

        /**
         * Test Case 6: Error handling when item doesn't exist
         * Purpose: Verify that requesting a non-existent item returns 404 error
         * Steps:
         *   1. Send a GET request for an item with ID that doesn't exist (999)
         *   2. Verify the response status is 404 (Not Found)
         *   3. Verify an appropriate error message is returned
         * Expected Result: Server should return 404 with "not found" error message
         */
        test("❌ returns 404 when item does not exist", async () => {
            const { app } = makeTestApp();

            const res = await request(app).get("/items/999");

            expect(res.status).toBe(404);
            expect(res.body.error).toContain("not found");
        });
    });
});
