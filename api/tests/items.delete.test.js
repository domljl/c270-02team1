// Done by Dominic (24021835)

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

let seedCounter = 0;

async function seedItem(db, itemData = {}) {
    const {
        name = "Test Item",
        sku = `SKU-${Date.now()}-${seedCounter++}`,
        description = "Test description",
        price = 10.0,
        quantity = 5,
    } = itemData;

    const { rows } = await db.query(
        "INSERT INTO items (name, sku, description, price, quantity) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [name, sku, description, price, quantity]
    );

    return rows[0].id;
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

maybeDescribe("DELETE /items/:id - Delete Item Route", () => {
    describe("✅ Success Cases - Items Deleted Successfully", () => {
        test("DELETE /items/:id deletes existing item and returns success", async () => {
            const { app, db } = makeTestApp();
            const itemId = await seedItem(db, { name: "Mouse", sku: "MOUSE-001", quantity: 10 });

            const res = await request(app).delete(`/items/${itemId}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true });

            // Verify item is actually removed from database
            const { rows } = await db.query("SELECT * FROM items WHERE id = $1", [itemId]);
            expect(rows[0]).toBeUndefined();
        });

        test("DELETE /items/:id successfully removes item with all fields populated", async () => {
            const { app, db } = makeTestApp();
            const itemId = await seedItem(db, {
                name: "Wireless Keyboard",
                sku: "KEYBOARD-002",
                description: "Mechanical keyboard with RGB",
                price: 89.99,
                quantity: 15,
            });

            const res = await request(app).delete(`/items/${itemId}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const { rows } = await db.query("SELECT * FROM items WHERE id = $1", [itemId]);
            expect(rows[0]).toBeUndefined();
        });

        test("DELETE /items/:id removes item with zero quantity", async () => {
            const { app, db } = makeTestApp();
            const itemId = await seedItem(db, { name: "Out of Stock", quantity: 0 });

            const res = await request(app).delete(`/items/${itemId}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true });
        });

        test("DELETE /items/:id works with large item ID", async () => {
            const { app, db } = makeTestApp();
            // Seed multiple items to get a higher ID
            for (let i = 0; i < 100; i++) {
                // eslint-disable-next-line no-await-in-loop
                await seedItem(db, { name: `Item ${i}`, sku: `SKU-${i}` });
            }
            const lastItemId = await seedItem(db, { name: "Last Item", sku: "LAST-ITEM" });

            const res = await request(app).delete(`/items/${lastItemId}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe("❌ Error Handling - Not Found Cases", () => {
        test("DELETE /items/:id returns 404 when deleting non-existent item", async () => {
            const { app } = makeTestApp();
            const nonExistentId = 99999;

            const res = await request(app).delete(`/items/${nonExistentId}`);

            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: "not found" });
        });

        test("DELETE /items/:id returns 404 for ID that never existed", async () => {
            const { app, db } = makeTestApp();
            await seedItem(db, { name: "Item 1" });
            await seedItem(db, { name: "Item 2" });

            const res = await request(app).delete("/items/1000");

            expect(res.status).toBe(404);
            expect(res.body.error).toBe("not found");
        });

        test("DELETE /items/:id returns 404 when database is empty", async () => {
            const { app } = makeTestApp();

            const res = await request(app).delete("/items/1");

            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: "not found" });
        });
    });

    describe("❌ Error Handling - Invalid ID Validation", () => {
        test("DELETE /items/:id returns 400 for non-numeric ID", async () => {
            const { app } = makeTestApp();

            const res = await request(app).delete("/items/abc");

            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: "invalid id" });
        });

        test("DELETE /items/:id returns 400 for decimal ID", async () => {
            const { app } = makeTestApp();

            const res = await request(app).delete("/items/12.5");

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("invalid id");
        });

        test("DELETE /items/:id returns 400 for negative ID", async () => {
            const { app } = makeTestApp();

            const res = await request(app).delete("/items/-1");

            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: "invalid id" });
        });

        test("DELETE /items/:id returns 400 for string with numbers", async () => {
            const { app } = makeTestApp();

            const res = await request(app).delete("/items/123abc");

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("invalid id");
        });

        test("DELETE /items/:id returns 400 for empty ID", async () => {
            const { app } = makeTestApp();

            const res = await request(app).delete("/items/ ");

            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: "invalid id" });
        });

        test("DELETE /items/:id returns 400 for special characters", async () => {
            const { app } = makeTestApp();

            const res = await request(app).delete("/items/@#$");

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("invalid id");
        });

        test("DELETE /items/:id returns 400 for zero ID", async () => {
            const { app } = makeTestApp();

            const res = await request(app).delete("/items/0");

            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: "invalid id" });
        });
    });

    describe("🔄 Idempotency - Delete Same Item Twice", () => {
        test("DELETE /items/:id returns 404 when deleting same item twice", async () => {
            const { app, db } = makeTestApp();
            const itemId = await seedItem(db, { name: "To Delete", sku: "DELETE-ME" });

            // First delete - should succeed
            const firstRes = await request(app).delete(`/items/${itemId}`);
            expect(firstRes.status).toBe(200);
            expect(firstRes.body.success).toBe(true);

            // Second delete - should return 404
            const secondRes = await request(app).delete(`/items/${itemId}`);
            expect(secondRes.status).toBe(404);
            expect(secondRes.body).toEqual({ error: "not found" });
        });

        test("DELETE /items/:id third attempt also returns 404", async () => {
            const { app, db } = makeTestApp();
            const itemId = await seedItem(db, { name: "Multi Delete Test" });

            // First delete
            await request(app).delete(`/items/${itemId}`);

            // Second delete
            await request(app).delete(`/items/${itemId}`);

            // Third delete - still 404
            const thirdRes = await request(app).delete(`/items/${itemId}`);
            expect(thirdRes.status).toBe(404);
            expect(thirdRes.body.error).toBe("not found");
        });
    });

    describe("🗄️ Database Integrity - Multiple Items", () => {
        test("DELETE /items/:id only deletes specified item, not others", async () => {
            const { app, db } = makeTestApp();
            const item1Id = await seedItem(db, { name: "Keep Item 1", sku: "KEEP-001" });
            const item2Id = await seedItem(db, { name: "Delete This", sku: "DELETE-002" });
            const item3Id = await seedItem(db, { name: "Keep Item 3", sku: "KEEP-003" });

            const res = await request(app).delete(`/items/${item2Id}`);

            expect(res.status).toBe(200);

            // Verify only item2 is deleted
            const { rows: item1Rows } = await db.query("SELECT * FROM items WHERE id = $1", [item1Id]);
            const { rows: item2Rows } = await db.query("SELECT * FROM items WHERE id = $1", [item2Id]);
            const { rows: item3Rows } = await db.query("SELECT * FROM items WHERE id = $1", [item3Id]);
            const item1 = item1Rows[0];
            const item2 = item2Rows[0];
            const item3 = item3Rows[0];

            expect(item1).toBeDefined();
            expect(item1.name).toBe("Keep Item 1");
            expect(item2).toBeUndefined();
            expect(item3).toBeDefined();
            expect(item3.name).toBe("Keep Item 3");
        });

        test("DELETE /items/:id maintains correct item count", async () => {
            const { app, db } = makeTestApp();
            await seedItem(db, { name: "Item 1" });
            const deleteId = await seedItem(db, { name: "Item 2" });
            await seedItem(db, { name: "Item 3" });

            const { rows: beforeCountRows } = await db.query("SELECT COUNT(*) as count FROM items");
            const beforeCount = beforeCountRows[0];
            expect(Number(beforeCount.count)).toBe(3);

            await request(app).delete(`/items/${deleteId}`);

            const { rows: afterCountRows } = await db.query("SELECT COUNT(*) as count FROM items");
            const afterCount = afterCountRows[0];
            expect(Number(afterCount.count)).toBe(2);
        });

        test("DELETE /items/:id can delete all items sequentially", async () => {
            const { app, db } = makeTestApp();
            const id1 = await seedItem(db, { name: "Item 1" });
            const id2 = await seedItem(db, { name: "Item 2" });
            const id3 = await seedItem(db, { name: "Item 3" });

            await request(app).delete(`/items/${id1}`);
            await request(app).delete(`/items/${id2}`);
            await request(app).delete(`/items/${id3}`);

            const { rows: countRows } = await db.query("SELECT COUNT(*) as count FROM items");
            const count = countRows[0];
            expect(Number(count.count)).toBe(0);
        });
    });

    describe("🔐 Edge Cases & Boundary Testing", () => {
        test("DELETE /items/:id handles concurrent deletes gracefully", async () => {
            const { app, db } = makeTestApp();
            const itemId = await seedItem(db, { name: "Concurrent Test" });

            // Simulate concurrent delete requests
            const [res1, res2] = await Promise.all([
                request(app).delete(`/items/${itemId}`),
                request(app).delete(`/items/${itemId}`),
            ]);

            // One should succeed, one should fail
            const statuses = [res1.status, res2.status].sort();
            expect(statuses).toEqual([200, 404]);
        });

        test("DELETE /items/:id with query parameters still works", async () => {
            const { app, db } = makeTestApp();
            const itemId = await seedItem(db, { name: "Query Param Test" });

            const res = await request(app).delete(`/items/${itemId}?force=true&reason=test`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        test("DELETE /items/:id verifies complete removal from all fields", async () => {
            const { app, db } = makeTestApp();
            const itemId = await seedItem(db, {
                name: "Complete Test",
                sku: "COMPLETE-SKU",
                description: "Full description",
                price: 99.99,
                quantity: 100,
            });

            await request(app).delete(`/items/${itemId}`);

            // Verify no trace in any field
            const { rows: byIdRows } = await db.query("SELECT * FROM items WHERE id = $1", [itemId]);
            const { rows: bySkuRows } = await db.query("SELECT * FROM items WHERE sku = $1", ["COMPLETE-SKU"]);
            const { rows: byNameRows } = await db.query("SELECT * FROM items WHERE name = $1", ["Complete Test"]);
            const byId = byIdRows[0];
            const bySku = bySkuRows[0];
            const byName = byNameRows[0];

            expect(byId).toBeUndefined();
            expect(bySku).toBeUndefined();
            expect(byName).toBeUndefined();
        });
    });
});
