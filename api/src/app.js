const express = require("express");
const path = require("path");

function createApp({ db }) {
    const app = express();

    // Parse JSON and URL-encoded form data
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Serve static files from 'public'
    app.use(express.static(path.join(__dirname, "public")));

    // Health check
    app.get("/health", (req, res) => {
        res.json({ status: "ok" });
    });

    // Get all items (JSON API)
    app.get("/items", (req, res) => {
        const items = db
            .prepare("SELECT id, name, sku, description, price, quantity FROM items ORDER BY id DESC")
            .all();
        res.json(items);
    });

    // Add a new item via API (POST /items)
    app.post("/items", (req, res) => {
        const { name, sku, quantity, description = "", price = 0 } = req.body || {};

        if (!name || !sku || quantity === undefined) {
            return res.status(400).json({ error: "name, sku, quantity required" });
        }
        if (!Number.isInteger(quantity) || quantity < 0) {
            return res.status(400).json({ error: "quantity must be >= 0 integer" });
        }
        const numericPrice = Number(price);
        if (Number.isNaN(numericPrice) || numericPrice < 0) {
            return res.status(400).json({ error: "price must be a number >= 0" });
        }

        try {
            const result = db
                .prepare("INSERT INTO items (name, sku, description, price, quantity) VALUES (?, ?, ?, ?, ?)")
                .run(name, sku, description, numericPrice, quantity);

            const item = db
                .prepare("SELECT id, name, sku, description, price, quantity FROM items WHERE id = ?")
                .get(result.lastInsertRowid);

            return res.status(201).json(item);
        } catch (err) {
            if (String(err).includes("UNIQUE")) {
                return res.status(409).json({ error: "sku must be unique" });
            }
            throw err;
        }
    });

    // Adjust quantity API
    app.post("/items/:id/adjust", (req, res) => {
        const id = Number(req.params.id);
        const { delta } = req.body || {};

        if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid id" });
        if (!Number.isInteger(delta) || delta === 0)
            return res.status(400).json({ error: "delta must be non-zero integer" });

        const item = db
            .prepare("SELECT id, name, sku, description, price, quantity FROM items WHERE id = ?")
            .get(id);
        if (!item) return res.status(404).json({ error: "not found" });

        const newQty = item.quantity + delta;
        if (newQty < 0) return res.status(400).json({ error: "quantity cannot go below 0" });

        db.prepare("UPDATE items SET quantity = ? WHERE id = ?").run(newQty, id);

        const updated = db
            .prepare("SELECT id, name, sku, description, price, quantity FROM items WHERE id = ?")
            .get(id);
        res.json(updated);
    });

    // Delete item API
    app.delete("/items", (req, res) => {
        return res.status(400).json({ error: "invalid id" });
    });
    app.delete("/items/", (req, res) => {
        return res.status(400).json({ error: "invalid id" });
    });

    app.delete("/items/:id", (req, res) => {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: "invalid id" });
        }

        const item = db.prepare("SELECT id FROM items WHERE id = ?").get(id);
        if (!item) {
            return res.status(404).json({ error: "not found" });
        }

        db.prepare("DELETE FROM items WHERE id = ?").run(id);
        return res.status(200).json({ success: true });
    });

    // =====================
    // Add Item Page Routes
    // =====================

    // Show Add Item form
    // Handle Add Item form submission
    app.post("/addItem", (req, res) => {
        const { name, description, price, quantity } = req.body || {};

        // Basic validation
        if (!name || quantity === undefined || quantity === "" || quantity === null) {
            return res.status(400).send("Name and quantity required");
        }

        // Generate SKU
        const sku = name.replace(/\s+/g, "-").toUpperCase() + "-" + Date.now();

        try {
            db.prepare("INSERT INTO items (name, sku, description, price, quantity) VALUES (?, ?, ?, ?, ?)")
                .run(name, sku, description || "", Number(price) || 0, Number(quantity));

            res.status(200).send("Item added successfully");
        } catch (err) {
            console.error(err);
            res.status(500).send("Server Error");
        }
    });

       // =====================
    // Edit Item Routes
    // =====================

    // Get a single item by ID
    app.get("/items/:id", (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "invalid id" });
        }

        const item = db
            .prepare("SELECT id, name, sku, description, price, quantity FROM items WHERE id = ?")
            .get(id);

        if (!item) {
            return res.status(404).json({ error: "not found" });
        }

        res.json(item);
    });

    // Edit/Update an item
    app.post("/editItem/:id", (req, res) => {
        const id = Number(req.params.id);
        const { name, sku, description, price, quantity } = req.body || {};

        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "invalid id" });
        }

        const item = db
            .prepare("SELECT id, name, sku, description, price, quantity FROM items WHERE id = ?")
            .get(id);

        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        // Validation
        if (quantity !== undefined && (!Number.isInteger(Number(quantity)) || Number(quantity) < 0)) {
            return res.status(400).json({ error: "quantity must be a non-negative integer" });
        }
        const numericPrice = price !== undefined ? Number(price) : item.price;
        if (Number.isNaN(numericPrice) || numericPrice < 0) {
            return res.status(400).json({ error: "price must be a number >= 0" });
        }

        // Update
        db.prepare(`
            UPDATE items
            SET name = ?, sku = ?, description = ?, price = ?, quantity = ?
            WHERE id = ?
        `).run(
            name ?? item.name,
            sku ?? item.sku,
            description ?? item.description,
            numericPrice,
            quantity ?? item.quantity,
            id
        );

        const updated = db
            .prepare("SELECT id, name, sku, description, price, quantity FROM items WHERE id = ?")
            .get(id);

        res.json(updated);
    });

    return app;
}


module.exports = { createApp };
