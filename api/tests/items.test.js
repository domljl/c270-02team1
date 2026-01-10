const request = require("supertest");
const { openDb } = require("../src/db");
const { createApp } = require("../src/app");

function makeTestApp() {
    const db = openDb({ filename: ":memory:" });
    const app = createApp({ db });
    return { app, db };
}

describe("Inventory API", () => {
    describe("Health Check", () => {
        test("GET /health returns ok", async () => {
            const { app } = makeTestApp();
            const res = await request(app).get("/health");
            expect(res.status).toBe(200);
            expect(res.body.status).toBe("ok");
        });
    });

    describe("GET /items", () => {
        test("returns empty array when no items exist", async () => {
            const { app } = makeTestApp();
            const res = await request(app).get("/items");
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        test("returns all items ordered by id DESC", async () => {
            const { app } = makeTestApp();

            await request(app).post("/items").send({
                name: "First Item",
                sku: "FIRST-001",
                quantity: 10,
            });

            await request(app).post("/items").send({
                name: "Second Item",
                sku: "SECOND-002",
                quantity: 20,
            });

            const res = await request(app).get("/items");
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
            expect(res.body[0].name).toBe("Second Item");
            expect(res.body[1].name).toBe("First Item");
        });

        test("returns correct item structure", async () => {
            const { app } = makeTestApp();

            await request(app).post("/items").send({
                name: "Test Item",
                sku: "TEST-001",
                quantity: 5,
            });

            const res = await request(app).get("/items");
            expect(res.status).toBe(200);
            expect(res.body[0]).toHaveProperty("id");
            expect(res.body[0]).toHaveProperty("name");
            expect(res.body[0]).toHaveProperty("sku");
            expect(res.body[0]).toHaveProperty("quantity");
        });
    });

    describe("POST /items", () => {
        test("creates item successfully with valid data", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/items").send({
                name: "Keyboard",
                sku: "KB-001",
                quantity: 10,
            });

            expect(res.status).toBe(201);
            expect(res.body).toMatchObject({
                name: "Keyboard",
                sku: "KB-001",
                quantity: 10,
            });
            expect(res.body).toHaveProperty("id");
        });

        test("SKU must be unique", async () => {
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
            expect(create2.body.error).toMatch(/unique/i);
        });

        test("requires all fields (name, sku, quantity)", async () => {
            const { app } = makeTestApp();

            const noName = await request(app).post("/items").send({
                sku: "TEST-001",
                quantity: 10,
            });
            expect(noName.status).toBe(400);
            expect(noName.body.error).toMatch(/required/i);

            const noSku = await request(app).post("/items").send({
                name: "Test Item",
                quantity: 10,
            });
            expect(noSku.status).toBe(400);
            expect(noSku.body.error).toMatch(/required/i);

            const noQuantity = await request(app).post("/items").send({
                name: "Test Item",
                sku: "TEST-001",
            });
            expect(noQuantity.status).toBe(400);
            expect(noQuantity.body.error).toMatch(/required/i);
        });

        test("quantity must be a non-negative integer", async () => {
            const { app } = makeTestApp();

            const negative = await request(app).post("/items").send({
                name: "Test",
                sku: "TEST-001",
                quantity: -5,
            });
            expect(negative.status).toBe(400);
            expect(negative.body.error).toMatch(/must be >= 0 integer/i);

            const float = await request(app).post("/items").send({
                name: "Test",
                sku: "TEST-002",
                quantity: 5.5,
            });
            expect(float.status).toBe(400);
            expect(float.body.error).toMatch(/must be >= 0 integer/i);

            const string = await request(app).post("/items").send({
                name: "Test",
                sku: "TEST-003",
                quantity: "10",
            });
            expect(string.status).toBe(400);
        });

        test("allows quantity of zero", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/items").send({
                name: "Test",
                sku: "TEST-001",
                quantity: 0,
            });
            expect(res.status).toBe(201);
            expect(res.body.quantity).toBe(0);
        });

        test("handles empty request body", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/items").send({});
            expect(res.status).toBe(400);
        });
    });

    describe("POST /items/:id/adjust", () => {
        test("increases quantity with positive delta", async () => {
            const { app } = makeTestApp();

            const created = await request(app).post("/items").send({
                name: "Mouse",
                sku: "MS-001",
                quantity: 10,
            });
            const id = created.body.id;

            const adjusted = await request(app).post(`/items/${id}/adjust`).send({
                delta: 5,
            });

            expect(adjusted.status).toBe(200);
            expect(adjusted.body.quantity).toBe(15);
        });

        test("decreases quantity with negative delta", async () => {
            const { app } = makeTestApp();

            const created = await request(app).post("/items").send({
                name: "Mouse",
                sku: "MS-001",
                quantity: 10,
            });
            const id = created.body.id;

            const adjusted = await request(app).post(`/items/${id}/adjust`).send({
                delta: -3,
            });

            expect(adjusted.status).toBe(200);
            expect(adjusted.body.quantity).toBe(7);
        });

        test("cannot go below zero", async () => {
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
            expect(bad.body.error).toMatch(/cannot go below 0/i);

            const ok = await request(app).post(`/items/${id}/adjust`).send({
                delta: -1,
            });
            expect(ok.status).toBe(200);
            expect(ok.body.quantity).toBe(0);
        });

        test("allows adjustment to exactly zero", async () => {
            const { app } = makeTestApp();

            const created = await request(app).post("/items").send({
                name: "Mouse",
                sku: "MS-001",
                quantity: 5,
            });
            const id = created.body.id;

            const adjusted = await request(app).post(`/items/${id}/adjust`).send({
                delta: -5,
            });

            expect(adjusted.status).toBe(200);
            expect(adjusted.body.quantity).toBe(0);
        });

        test("returns 404 for non-existent item", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/items/99999/adjust").send({
                delta: 5,
            });

            expect(res.status).toBe(404);
            expect(res.body.error).toMatch(/not found/i);
        });

        test("requires delta to be non-zero integer", async () => {
            const { app } = makeTestApp();

            const created = await request(app).post("/items").send({
                name: "Mouse",
                sku: "MS-001",
                quantity: 10,
            });
            const id = created.body.id;

            const zeroDelta = await request(app).post(`/items/${id}/adjust`).send({
                delta: 0,
            });
            expect(zeroDelta.status).toBe(400);
            expect(zeroDelta.body.error).toMatch(/non-zero integer/i);

            const floatDelta = await request(app).post(`/items/${id}/adjust`).send({
                delta: 1.5,
            });
            expect(floatDelta.status).toBe(400);

            const stringDelta = await request(app).post(`/items/${id}/adjust`).send({
                delta: "5",
            });
            expect(stringDelta.status).toBe(400);
        });

        test("requires delta field", async () => {
            const { app } = makeTestApp();

            const created = await request(app).post("/items").send({
                name: "Mouse",
                sku: "MS-001",
                quantity: 10,
            });
            const id = created.body.id;

            const res = await request(app).post(`/items/${id}/adjust`).send({});
            expect(res.status).toBe(400);
        });

        test("validates id parameter", async () => {
            const { app } = makeTestApp();

            const res = await request(app).post("/items/invalid/adjust").send({
                delta: 5,
            });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/invalid id/i);
        });
    });

    describe("Integration Workflows", () => {
        test("complete workflow: create, list, adjust", async () => {
            const { app } = makeTestApp();

            // Create item
            const created = await request(app).post("/items").send({
                name: "Headphones",
                sku: "HP-001",
                quantity: 20,
            });
            expect(created.status).toBe(201);
            const itemId = created.body.id;

            // List items
            const list1 = await request(app).get("/items");
            expect(list1.status).toBe(200);
            expect(list1.body.length).toBe(1);
            expect(list1.body[0].quantity).toBe(20);

            // Adjust quantity up
            const adjust1 = await request(app).post(`/items/${itemId}/adjust`).send({
                delta: 10,
            });
            expect(adjust1.status).toBe(200);
            expect(adjust1.body.quantity).toBe(30);

            // Verify adjustment
            const list2 = await request(app).get("/items");
            expect(list2.body[0].quantity).toBe(30);

            // Adjust quantity down
            const adjust2 = await request(app).post(`/items/${itemId}/adjust`).send({
                delta: -15,
            });
            expect(adjust2.status).toBe(200);
            expect(adjust2.body.quantity).toBe(15);
        });

        test("multiple items can be managed independently", async () => {
            const { app } = makeTestApp();

            const item1 = await request(app).post("/items").send({
                name: "Item 1",
                sku: "ITEM-001",
                quantity: 10,
            });

            const item2 = await request(app).post("/items").send({
                name: "Item 2",
                sku: "ITEM-002",
                quantity: 20,
            });

            await request(app).post(`/items/${item1.body.id}/adjust`).send({ delta: 5 });
            await request(app).post(`/items/${item2.body.id}/adjust`).send({ delta: -5 });

            const list = await request(app).get("/items");
            expect(list.body.find((i) => i.id === item1.body.id).quantity).toBe(15);
            expect(list.body.find((i) => i.id === item2.body.id).quantity).toBe(15);
        });
    });
});
