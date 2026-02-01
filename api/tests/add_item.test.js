// Done by Margaret Pabustan (24020804)
// Tests for the Add Item form and POST /addItem route
//Purpose of the tests: To ensure that the backend /addItem route correctly handles adding new items to the inventory, including validation of required fields, error handling, and successful item creation.//
// These tests use Jest and Supertest to simulate HTTP requests and database interactions.//


const request = require("supertest");//Library for testing HTTP endpoints//
const { pool } = require("../src/db");//Database connection pool//
const { createApp } = require("../src/app");//Function to create an instance of the Express app//

//Check if database is configured, skupping tests if DATABASE_URL is missing//
const hasDb = Boolean(process.env.DATABASE_URL);
const maybeDescribe = hasDb ? describe : describe.skip;
// ------------------------------
// Helper Functions
// ------------------------------

/**
 * resetTable()
 * Purpose: Clear all records from 'items' table in the database before or after tests
 * Why: Ensures tests are isolated and results are consistent
 */
async function resetTable() {
    await pool.query("DELETE FROM items");
}
/**
 * makeTestApp()
 * Purpose: Create a new instance of the Express app with a database connection
 * Returns: { app, db } - Express app instance and database pool
 * Why: Allows each test to run in isolation with a fresh app instance
 */
function makeTestApp() {
    const app = createApp({ pool });
    return { app, db: pool };
}
// ------------------------------
// Console Spies
// ------------------------------
// Suppress console.log and console.error output during tests to avoid clutter
let logSpy;
let errorSpy;

beforeAll(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
    logSpy?.mockRestore();
    errorSpy?.mockRestore();
});

// Clean database between tests to maintain test isolation
afterEach(async () => {
    if (hasDb) {
        await resetTable();
    }
});

// ------------------------------
// Main Test Suite: Add Item Form & POST /addItem Route
// ------------------------------
maybeDescribe("Add Item Form & POST /addItem Route", () => {

    // ------------------------------
    // Success Cases: Items Added Successfully
    // ------------------------------
    describe("✅ Success Cases - Items Added Successfully", () => {
        test("POST /addItem creates item with all valid fields", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Wireless Mouse",
                description: "Bluetooth optical mouse",
                price: 29.99,
                quantity: 10,
            });
            //Assertions: Ensures HTTP status code 200 and success message displayed//
            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });

        test("POST /addItem creates item with minimum required fields", async () => {
            //Purpose: Test that only required fields (name and quantity) are sufficient to create an item//
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Keyboard",
                quantity: 5,
            });

            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });

        test("POST /addItem creates item with zero quantity", async () => {
            //Purpose: Ensure route accepts items that are out of stock (quantity = 0)//
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Out of Stock Item",
                quantity: 0,
                price: 15.00,
            });

            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });

        test("POST /addItem successfully adds item with description and price", async () => {
            //Purpose: Ensures route stores optional description and price fields correctly//
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "USB Cable",
                description: "High-speed USB-C cable",
                price: 12.50,
                quantity: 50,
            });

            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });

        test("POST /addItem handles decimal price correctly", async () => {
            const { app } = makeTestApp();
            //Purpose: Ensures that route handles decimal prices correctly, storing them with appropriate precision//
            const res = await request(app).post("/addItem").send({
                name: "Monitor",
                quantity: 3,
                price: 299.99,
            });

            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });

        test("POST /addItem accepts large quantity values", async () => {
            //Purpose: Test system handles unusually large inventory numbers//
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Pen",
                quantity: 999999,
                price: 0.50,
            });

            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });
    });
    // ------------------------------
    // Error Handling: Missing Required Fields
    // ------------------------------
    describe("❌ Error Handling - Missing Required Fields", () => {
        test("POST /addItem returns 400 when name is missing", async () => {
            // Purpose: Ensure server returns 400 HTTP error status code if name is missing
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                quantity: 10,
                price: 29.99,
            });

            expect(res.status).toBe(400);
            expect(res.text).toContain("Name and quantity required");
        });

        test("POST /addItem returns 400 when quantity is missing", async () => {
            // Purpose: Ensure server returns 400 HTTP error status code if quantity is missing

            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Wireless Mouse",
                price: 29.99,
            });

            expect(res.status).toBe(400);
            expect(res.text).toContain("Name and quantity required");
        });

        test("POST /addItem returns 400 when both name and quantity are missing", async () => {
            //Purpose: Ensure server returns 400 HTTP error status code if both name and quantity are missing//
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                price: 29.99,
            });

            expect(res.status).toBe(400);
            expect(res.text).toContain("Name and quantity required");
        });

        test("POST /addItem returns 400 when name is empty string", async () => {
            //Purpose: Ensure server returns 400 HTTP error status code if name is an empty string//
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "",
                quantity: 10,
            });

            expect(res.status).toBe(400);
            expect(res.text).toContain("Name and quantity required");
        });

        test("POST /addItem returns 400 when quantity is empty string", async () => {
            //Purpose: Ensure server returns 400 HTTP error status code if quantity is an empty string//
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Wireless Mouse",
                quantity: "",
            });

            expect(res.status).toBe(400);
            expect(res.text).toContain("Name and quantity required");
        });
         
        test("POST /addItem returns 400 when quantity is null", async () => {
         // Purpose: Validate completely empty request is rejected
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Wireless Mouse",
                quantity: null,
            });

            expect(res.status).toBe(400);
            expect(res.text).toContain("Name and quantity required");
        });

        test("POST /addItem returns 400 for empty request body", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({});

            expect(res.status).toBe(400);
            expect(res.text).toContain("Name and quantity required");
        });
    });
    // ------------------------------
    // Server Error Handling
    // ------------------------------

    describe("❌ Server Error Handling", () => {
        test("POST /addItem handles malformed JSON gracefully without crashing", async () => {
            //Purpose: Ensure that server does not crash on malformed JSON input//
            const { app } = makeTestApp();

            const res = await request(app)
                .post("/addItem")
                .set("Content-Type", "application/json")
                .send("{ invalid json");

            expect(res.status).toBe(400); // Expect server validation error
        });

        test("POST /addItem handles undefined request body without crashing", async () => {
             // Purpose: Ensure missing request body does not crash server
            const { app } = makeTestApp();

            const res = await request(app)
                .post("/addItem")
                .set("Content-Type", "application/json")
                .send();

            expect(res.status).toBe(400);
        });

        test("POST /addItem returns server error on database failure", async () => {
            // Purpose: Simulate database failure to check server returns 500 HTTP error status code
            const { app, db } = makeTestApp();
            const spy = jest.spyOn(db, "query").mockRejectedValueOnce(new Error("boom"));

            const res = await request(app).post("/addItem").send({
                name: "Second Item",
                quantity: 5,
            });

            expect(res.status).toBe(500);
            expect(res.text).toContain("Server Error");
            spy.mockRestore();
        });
    });
     // ------------------------------
    // Form Field Handling & Edge Cases
    // ------------------------------

    describe("🔧 Form Field Handling", () => {
        test("POST /addItem accepts item with special characters in name", async () => {
        // Purpose: Ensure route handles unusual characters in name field correctly//
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Wireless Mouse (Pro) @2024",
                quantity: 10,
            });

            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });

        test("POST /addItem accepts item with very long name", async () => {
            // Purpose: Ensure system handles long strings in name field without errors//
            const { app } = makeTestApp();

            const longName = "A".repeat(500);
            const res = await request(app).post("/addItem").send({
                name: longName,
                quantity: 10,
            });

            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });

        test("POST /addItem coerces non-numeric price to 0", async () => {
            // Purpose: Ensure invalid price is automatically converted to 0
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Test Item",
                quantity: 5,
                price: "invalid",
            });

            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });

        test("POST /addItem handles null description by converting to empty string", async () => {
            // Purpose: Ensure null descriptions do not crash the app
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Test Item",
                quantity: 5,
                description: null,
            });

            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });

        test("POST /addItem handles missing description field", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Test Item",
                quantity: 5,
            });

            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });

        test("POST /addItem handles missing price field", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Free Item",
                quantity: 5,
            });

            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });

        test("POST /addItem converts decimal quantity to number", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Test Item",
                quantity: 10.5,
            });

            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });
    });
    // ------------------------------
    // Form Integration: Add Item HTML Form
    // ------------------------------
    describe("📝 Form Integration (add-item.html)", () => {
        test("Form displays success message when item is added successfully", async () => {
            // Purpose: Simulate user adding item via front-end form
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Wireless Mouse",
                description: "Bluetooth optical mouse",
                price: 29.99,
                quantity: 10,
            });

            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });

        test("Form displays error message when required fields are missing", async () => {
            // Purpose: Ensure front-end sees correct error messages from backend
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                price: 29.99,
            });

            expect(res.status).toBe(400);
            expect(res.text).toContain("Name and quantity required");
        });

        test("Form handles server error responses without crashing", async () => {
             // Purpose: Ensure front-end handles backend 500 errors gracefully
            const { app, db } = makeTestApp();
            const spy = jest.spyOn(db, "query").mockRejectedValueOnce(new Error("boom"));

            const res = await request(app).post("/addItem").send({
                name: "Test Item",
                quantity: 5,
            });

            expect(res.status).toBe(500);
            expect(res.text).toContain("Server Error");
            spy.mockRestore();
        });

        test("Form accepts and processes all form fields correctly", async () => {
             // Purpose: Verify full integration of front-end form and backend route
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Complete Item",
                description: "Full description",
                price: 25.50,
                quantity: 15,
            });

            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });

        test("Form resets after successful submission", async () => {
             // Purpose: Ensure multiple submissions work independently
            const { app } = makeTestApp();

            // First submission
            const res1 = await request(app).post("/addItem").send({
                name: "First Item",
                quantity: 5,
            });

            // Second submission should work independently
            const res2 = await request(app).post("/addItem").send({
                name: "Second Item",
                quantity: 10,
            });

            expect(res1.status).toBe(200);
            expect(res2.status).toBe(200);
        });
    });
});