const request = require("supertest");
const { openDb } = require("../src/db");
const { createApp } = require("../src/app");

function makeTestApp() {
    const db = openDb({ filename: ":memory:" });
    const app = createApp({ db });
    return { app, db };
}

describe("End-to-End Workflows", () => {
    describe("Complete Inventory Management Workflow", () => {
        test("full lifecycle: health check, create items, list, adjust quantities", async () => {
            const { app } = makeTestApp();

            // 1. Verify application health
            const health = await request(app).get("/health");
            expect(health.status).toBe(200);
            expect(health.body.status).toBe("ok");

            // 2. Initially no items
            const initialList = await request(app).get("/items");
            expect(initialList.status).toBe(200);
            expect(initialList.body).toEqual([]);

            // 3. Create multiple items
            const item1 = await request(app).post("/items").send({
                name: "Laptop",
                sku: "LAP-001",
                quantity: 5,
            });
            expect(item1.status).toBe(201);

            const item2 = await request(app).post("/items").send({
                name: "Mouse",
                sku: "MOU-001",
                quantity: 20,
            });
            expect(item2.status).toBe(201);

            const item3 = await request(app).post("/items").send({
                name: "Keyboard",
                sku: "KEY-001",
                quantity: 15,
            });
            expect(item3.status).toBe(201);

            // 4. Verify all items are listed (newest first)
            const listAll = await request(app).get("/items");
            expect(listAll.status).toBe(200);
            expect(listAll.body.length).toBe(3);
            expect(listAll.body[0].sku).toBe("KEY-001");
            expect(listAll.body[1].sku).toBe("MOU-001");
            expect(listAll.body[2].sku).toBe("LAP-001");

            // 5. Adjust quantities - receiving new stock
            const receive1 = await request(app)
                .post(`/items/${item1.body.id}/adjust`)
                .send({ delta: 3 });
            expect(receive1.status).toBe(200);
            expect(receive1.body.quantity).toBe(8);

            // 6. Adjust quantities - selling items
            const sell1 = await request(app)
                .post(`/items/${item2.body.id}/adjust`)
                .send({ delta: -5 });
            expect(sell1.status).toBe(200);
            expect(sell1.body.quantity).toBe(15);

            // 7. Verify updated quantities
            const finalList = await request(app).get("/items");
            const laptop = finalList.body.find((i) => i.sku === "LAP-001");
            const mouse = finalList.body.find((i) => i.sku === "MOU-001");
            const keyboard = finalList.body.find((i) => i.sku === "KEY-001");

            expect(laptop.quantity).toBe(8);
            expect(mouse.quantity).toBe(15);
            expect(keyboard.quantity).toBe(15);
        });

        test("stock management: prevent overselling", async () => {
            const { app } = makeTestApp();

            // Create item with limited stock
            const item = await request(app).post("/items").send({
                name: "Limited Edition Mouse",
                sku: "LIM-001",
                quantity: 3,
            });

            // Sell 2 units - should succeed
            const sell1 = await request(app)
                .post(`/items/${item.body.id}/adjust`)
                .send({ delta: -2 });
            expect(sell1.status).toBe(200);
            expect(sell1.body.quantity).toBe(1);

            // Try to sell 2 more units - should fail
            const sell2 = await request(app)
                .post(`/items/${item.body.id}/adjust`)
                .send({ delta: -2 });
            expect(sell2.status).toBe(400);

            // Verify quantity unchanged
            const check = await request(app).get("/items");
            const foundItem = check.body.find((i) => i.id === item.body.id);
            expect(foundItem.quantity).toBe(1);

            // Sell last unit - should succeed
            const sell3 = await request(app)
                .post(`/items/${item.body.id}/adjust`)
                .send({ delta: -1 });
            expect(sell3.status).toBe(200);
            expect(sell3.body.quantity).toBe(0);
        });

        test("duplicate SKU prevention workflow", async () => {
            const { app } = makeTestApp();

            // Create item with specific SKU
            const item1 = await request(app).post("/items").send({
                name: "Original Product",
                sku: "PROD-123",
                quantity: 10,
            });
            expect(item1.status).toBe(201);

            // Try to create another item with same SKU
            const item2 = await request(app).post("/items").send({
                name: "Duplicate Product",
                sku: "PROD-123",
                quantity: 5,
            });
            expect(item2.status).toBe(409);

            // Verify only one item exists
            const list = await request(app).get("/items");
            expect(list.body.length).toBe(1);
            expect(list.body[0].name).toBe("Original Product");
        });

        test("bulk operations and data integrity", async () => {
            const { app } = makeTestApp();

            // Create 10 items
            const items = [];
            for (let i = 1; i <= 10; i++) {
                const response = await request(app).post("/items").send({
                    name: `Item ${i}`,
                    sku: `SKU-${String(i).padStart(3, "0")}`,
                    quantity: i * 10,
                });
                expect(response.status).toBe(201);
                items.push(response.body);
            }

            // Verify all items created
            const list = await request(app).get("/items");
            expect(list.body.length).toBe(10);

            // Perform multiple adjustments
            for (const item of items) {
                await request(app)
                    .post(`/items/${item.id}/adjust`)
                    .send({ delta: 5 });
            }

            // Verify all quantities increased
            const updatedList = await request(app).get("/items");
            updatedList.body.forEach((item, index) => {
                const originalQuantity = (10 - index) * 10; // Reverse order
                expect(item.quantity).toBe(originalQuantity + 5);
            });
        });
    });

    describe("Error Handling and Recovery", () => {
        test("recovers from validation errors without affecting database", async () => {
            const { app } = makeTestApp();

            // Create valid item
            const valid = await request(app).post("/items").send({
                name: "Valid Item",
                sku: "VAL-001",
                quantity: 10,
            });
            expect(valid.status).toBe(201);

            // Attempt invalid operations
            await request(app).post("/items").send({
                name: "Invalid",
                sku: "INV-001",
                quantity: -5,
            });

            await request(app).post("/items").send({
                name: "",
                sku: "INV-002",
                quantity: 10,
            });

            await request(app)
                .post(`/items/${valid.body.id}/adjust`)
                .send({ delta: 0 });

            // Verify database integrity
            const list = await request(app).get("/items");
            expect(list.body.length).toBe(1);
            expect(list.body[0].name).toBe("Valid Item");
            expect(list.body[0].quantity).toBe(10);
        });

        test("handles invalid IDs gracefully", async () => {
            const { app } = makeTestApp();

            // Non-existent ID
            const notFound = await request(app)
                .post("/items/99999/adjust")
                .send({ delta: 5 });
            expect(notFound.status).toBe(404);

            // Invalid ID format
            const invalid = await request(app)
                .post("/items/invalid/adjust")
                .send({ delta: 5 });
            expect(invalid.status).toBe(400);

            // Negative ID
            const negative = await request(app)
                .post("/items/-1/adjust")
                .send({ delta: 5 });
            expect(negative.status).toBe(404);
        });

        test("handles malformed requests", async () => {
            const { app } = makeTestApp();

            // Missing content
            const empty = await request(app).post("/items").send({});
            expect(empty.status).toBe(400);

            // Invalid JSON structure
            const item = await request(app).post("/items").send({
                name: "Test",
                sku: "TEST-001",
                quantity: 10,
            });

            const badAdjust = await request(app)
                .post(`/items/${item.body.id}/adjust`)
                .send({});
            expect(badAdjust.status).toBe(400);
        });
    });

    describe("Static File Serving", () => {
        test("serves all required frontend files", async () => {
            const { app } = makeTestApp();

            const files = [
                { path: "/", contentType: /html/, content: /inventory/i },
                { path: "/add-item.html", contentType: /html/, content: /add new item/i },
                { path: "/styles.css", contentType: /css/, content: /hero/ },
                { path: "/main.js", contentType: /javascript/, content: /fetchInventory/ },
            ];

            for (const file of files) {
                const response = await request(app).get(file.path);
                expect(response.status).toBe(200);
                expect(response.headers["content-type"]).toMatch(file.contentType);
                expect(response.text).toMatch(file.content);
            }
        });

        test("returns 404 for non-existent files", async () => {
            const { app } = makeTestApp();

            const response = await request(app).get("/nonexistent.html");
            expect(response.status).toBe(404);
        });
    });

    describe("API and Frontend Integration", () => {
        test("API provides data in format expected by frontend", async () => {
            const { app } = makeTestApp();

            // Create item
            await request(app).post("/items").send({
                name: "Test Product",
                sku: "TEST-001",
                quantity: 50,
            });

            // Get items as frontend would
            const response = await request(app).get("/items");
            expect(response.status).toBe(200);

            // Verify structure matches frontend expectations
            const items = response.body;
            expect(Array.isArray(items)).toBe(true);
            
            items.forEach((item) => {
                expect(item).toHaveProperty("id");
                expect(item).toHaveProperty("name");
                expect(item).toHaveProperty("sku");
                expect(item).toHaveProperty("quantity");
                expect(typeof item.id).toBe("number");
                expect(typeof item.name).toBe("string");
                expect(typeof item.sku).toBe("string");
                expect(typeof item.quantity).toBe("number");
            });
        });
    });

    describe("Concurrent Operations", () => {
        test("handles multiple simultaneous item creations", async () => {
            const { app } = makeTestApp();

            // Create items concurrently
            const promises = [];
            for (let i = 1; i <= 5; i++) {
                promises.push(
                    request(app).post("/items").send({
                        name: `Concurrent Item ${i}`,
                        sku: `CONC-${i}`,
                        quantity: i * 5,
                    })
                );
            }

            const results = await Promise.all(promises);
            results.forEach((result) => {
                expect(result.status).toBe(201);
            });

            // Verify all created
            const list = await request(app).get("/items");
            expect(list.body.length).toBe(5);
        });

        test("handles multiple adjustments to same item", async () => {
            const { app } = makeTestApp();

            const item = await request(app).post("/items").send({
                name: "Multi-adjust Item",
                sku: "MULTI-001",
                quantity: 100,
            });

            // Sequential adjustments (simulating concurrent user actions)
            await request(app)
                .post(`/items/${item.body.id}/adjust`)
                .send({ delta: 10 });
            
            await request(app)
                .post(`/items/${item.body.id}/adjust`)
                .send({ delta: -5 });
            
            await request(app)
                .post(`/items/${item.body.id}/adjust`)
                .send({ delta: 3 });

            // Verify final quantity
            const final = await request(app).get("/items");
            const updatedItem = final.body.find((i) => i.id === item.body.id);
            expect(updatedItem.quantity).toBe(108);
        });
    });
});
