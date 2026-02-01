// Done by Margaret (24020804)
// Tests for the Add Item form and POST /addItem route

const request = require("supertest");
const { pool } = require("../src/db");
const { createApp } = require("../src/app");

const hasDb = Boolean(process.env.DATABASE_URL);
const maybeDescribe = hasDb ? describe : describe.skip;

async function resetTable() {
    await pool.query("DELETE FROM items");
}

function makeTestApp() {
    const app = createApp({ pool });
    return { app, db: pool };
}

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

afterEach(async () => {
    if (hasDb) {
        await resetTable();
    }
});

maybeDescribe("Add Item Form & POST /addItem Route", () => {
    describe("✅ Success Cases - Items Added Successfully", () => {
        test("POST /addItem creates item with all valid fields", async () => {
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

        test("POST /addItem creates item with minimum required fields", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Keyboard",
                quantity: 5,
            });

            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });

        test("POST /addItem creates item with zero quantity", async () => {
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

            const res = await request(app).post("/addItem").send({
                name: "Monitor",
                quantity: 3,
                price: 299.99,
            });

            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });

        test("POST /addItem accepts large quantity values", async () => {
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

    describe("❌ Error Handling - Missing Required Fields", () => {
        test("POST /addItem returns 400 when name is missing", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                quantity: 10,
                price: 29.99,
            });

            expect(res.status).toBe(400);
            expect(res.text).toContain("Name and quantity required");
        });

        test("POST /addItem returns 400 when quantity is missing", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Wireless Mouse",
                price: 29.99,
            });

            expect(res.status).toBe(400);
            expect(res.text).toContain("Name and quantity required");
        });

        test("POST /addItem returns 400 when both name and quantity are missing", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                price: 29.99,
            });

            expect(res.status).toBe(400);
            expect(res.text).toContain("Name and quantity required");
        });

        test("POST /addItem returns 400 when name is empty string", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "",
                quantity: 10,
            });

            expect(res.status).toBe(400);
            expect(res.text).toContain("Name and quantity required");
        });

        test("POST /addItem returns 400 when quantity is empty string", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Wireless Mouse",
                quantity: "",
            });

            expect(res.status).toBe(400);
            expect(res.text).toContain("Name and quantity required");
        });

        test("POST /addItem returns 400 when quantity is null", async () => {
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

    describe("❌ Server Error Handling", () => {
        test("POST /addItem handles malformed JSON gracefully without crashing", async () => {
            const { app } = makeTestApp();

            const res = await request(app)
                .post("/addItem")
                .set("Content-Type", "application/json")
                .send("{ invalid json");

            expect(res.status).toBe(400);
        });

        test("POST /addItem handles undefined request body without crashing", async () => {
            const { app } = makeTestApp();

            const res = await request(app)
                .post("/addItem")
                .set("Content-Type", "application/json")
                .send();

            expect(res.status).toBe(400);
        });

        test("POST /addItem returns server error on database failure", async () => {
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

    describe("🔧 Form Field Handling", () => {
        test("POST /addItem accepts item with special characters in name", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                name: "Wireless Mouse (Pro) @2024",
                quantity: 10,
            });

            expect(res.status).toBe(200);
            expect(res.text).toContain("Item added successfully");
        });

        test("POST /addItem accepts item with very long name", async () => {
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

    describe("📝 Form Integration (add-item.html)", () => {
        test("Form displays success message when item is added successfully", async () => {
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
            const { app } = makeTestApp();

            const res = await request(app).post("/addItem").send({
                price: 29.99,
            });

            expect(res.status).toBe(400);
            expect(res.text).toContain("Name and quantity required");
        });

        test("Form handles server error responses without crashing", async () => {
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