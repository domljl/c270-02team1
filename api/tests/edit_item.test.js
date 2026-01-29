const request = require("supertest");
const { pool, initDb } = require("../src/db");
const { createApp } = require("../src/app");

const hasDb = Boolean(process.env.DATABASE_URL);
const maybeDescribe = hasDb ? describe : describe.skip;

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

async function resetTable() {
    await pool.query("DELETE FROM items");
    await pool.query("ALTER SEQUENCE items_id_seq RESTART WITH 1");
}

function makeTestApp() {
    const app = createApp({ pool });
    return { app, db: pool };
}

maybeDescribe("Edit Item Feature", () => {
    beforeAll(async () => {
        await initDb();
    });

    beforeEach(async () => {
        await resetTable();
    });
    // -------------------
    // POST /editItem/:id
    // -------------------
    describe("POST /editItem/:id", () => {
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

        test("❌ returns 400 for invalid id format", async () => {
            const { app } = makeTestApp();

            const res = await request(app).get("/items/abc");

            expect(res.status).toBe(400);
            expect(res.body.error).toContain("invalid id");
        });

        test("❌ returns 404 when item does not exist", async () => {
            const { app } = makeTestApp();

            const res = await request(app).get("/items/999");

            expect(res.status).toBe(404);
            expect(res.body.error).toContain("not found");
        });
    });
});
