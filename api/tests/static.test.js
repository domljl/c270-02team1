const request = require("supertest");
const { openDb } = require("../src/db");
const { createApp } = require("../src/app");

function makeTestApp() {
    const db = openDb({ filename: ":memory:" });
    const app = createApp({ db });
    return { app, db };
}

describe("Static assets", () => {
    test("GET / serves the inventory homepage", async () => {
        const { app } = makeTestApp();
        const res = await request(app).get("/");

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toMatch(/html/);
        expect(res.text).toMatch(/Store inventory/i);
    });

    test("GET /add-item.html serves the add-item page", async () => {
        const { app } = makeTestApp();
        const res = await request(app).get("/add-item.html");

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toMatch(/html/);
        expect(res.text).toMatch(/Add a new item/i);
    });

    test("GET /styles.css returns stylesheet", async () => {
        const { app } = makeTestApp();
        const res = await request(app).get("/styles.css");

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toMatch(/text\/css/);
        expect(res.text).toContain(".hero");
    });

    test("GET /main.js returns script", async () => {
        const { app } = makeTestApp();
        const res = await request(app).get("/main.js");

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toMatch(/javascript/);
        expect(res.text).toMatch(/fetchInventory/);
    });
});
