const request = require("supertest");
const { openDb } = require("../src/db");
const { createApp } = require("../src/app");

function makeTestApp() {
    const db = openDb({ filename: ":memory:" });
    const app = createApp({ db });
    return { app, db };
}

describe("Inventory API", () => {
    test("GET /health returns ok", async () => {
        const { app } = makeTestApp();
        const res = await request(app).get("/health");
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
    });

    test("POST /items creates item, SKU must be unique", async () => {
        const { app } = makeTestApp();

        const create1 = await request(app).post("/items").send({
            name: "Keyboard",
            sku: "KB-001",
            quantity: 10,
        });
        expect(create1.status).toBe(201);

        const create2 = await request(app).post("/items").send({
            name: "Another Keyboard",
            sku: "KB-001",
            quantity: 5,
        });
        expect(create2.status).toBe(409);
    });

    test("POST /items/:id/adjust cannot go below zero", async () => {
        const { app } = makeTestApp();

        const created = await request(app).post("/items").send({
            name: "Mouse",
            sku: "MS-001",
            quantity: 1,
        });
        expect(created.status).toBe(201);

        const id = created.body.id;

        const bad = await request(app).post(`/items/${id}/adjust`).send({
            delta: -2,
        });
        expect(bad.status).toBe(400);

        const ok = await request(app).post(`/items/${id}/adjust`).send({
            delta: -1,
        });
        expect(ok.status).toBe(200);
        expect(ok.body.quantity).toBe(0);
    });
});
