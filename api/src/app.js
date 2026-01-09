const express = require("express");
const path = require("path");

function createApp({ db }) {
    const app = express();
    app.use(express.json());
    app.use(express.static(path.join(__dirname, "public")));

    app.get("/health", (req, res) => {
        res.json({ status: "ok" });
    });

    app.get("/items", (req, res) => {
        const items = db.prepare("SELECT id, name, sku, quantity FROM items ORDER BY id DESC").all();
        res.json(items);
    });

    app.post("/items", (req, res) => {
        const { name, sku, quantity } = req.body || {};

        if (!name || !sku || quantity === undefined) {
            return res.status(400).json({ error: "name, sku, quantity required" });
        }
        if (!Number.isInteger(quantity) || quantity < 0) {
            return res.status(400).json({ error: "quantity must be >= 0 integer" });
        }

        try {
            const result = db
                .prepare("INSERT INTO items (name, sku, quantity) VALUES (?, ?, ?)")
                .run(name, sku, quantity);

            const item = db
                .prepare("SELECT id, name, sku, quantity FROM items WHERE id = ?")
                .get(result.lastInsertRowid);

            return res.status(201).json(item);
        } catch (err) {
            if (String(err).includes("UNIQUE")) {
                return res.status(409).json({ error: "sku must be unique" });
            }
            throw err;
        }
    });

    app.post("/items/:id/adjust", (req, res) => {
        const id = Number(req.params.id);
        const { delta } = req.body || {};

        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "invalid id" });
        }
        if (!Number.isInteger(delta) || delta === 0) {
            return res.status(400).json({ error: "delta must be non-zero integer" });
        }

        const item = db.prepare("SELECT id, name, sku, quantity FROM items WHERE id = ?").get(id);

        if (!item) return res.status(404).json({ error: "not found" });

        const newQty = item.quantity + delta;
        if (newQty < 0) {
            return res.status(400).json({ error: "quantity cannot go below 0" });
        }

        db.prepare("UPDATE items SET quantity = ? WHERE id = ?").run(newQty, id);

        const updated = db.prepare("SELECT id, name, sku, quantity FROM items WHERE id = ?").get(id);

        res.json(updated);
    });

    return app;
}

module.exports = { createApp };
