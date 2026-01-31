const express = require("express");
const path = require("path");

function createApp({ pool }) {
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, "public")));

    app.get("/health", (req, res) => {
        res.json({ status: "ok" });
    });

    app.get("/items", async (req, res) => {
        try {
            const q = (req.query.query || req.query.q || "").trim().toLowerCase();
            let rows;
            if (q) {
                const like = `%${q}%`;
                const { rows: data } = await pool.query(
                    `SELECT id, name, sku, description, price, quantity
                     FROM items
                     WHERE lower(name) LIKE $1 OR lower(sku) LIKE $2 OR lower(description) LIKE $3
                     ORDER BY id DESC`,
                    [like, like, like]
                );
                rows = data;
            } else {
                const { rows: data } = await pool.query(
                    "SELECT id, name, sku, description, price, quantity FROM items ORDER BY id DESC"
                );
                rows = data;
            }
            res.json(rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Server Error" });
        }
    });

    app.post("/items", async (req, res) => {
        const { name, sku, quantity, description = "", price = 0 } = req.body || {};
        const numericQty = Number(quantity);
        const safeQty = Number.isFinite(numericQty) ? Math.round(numericQty) : null;
        const numericPrice = Number(price);
        const safePrice = Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : 0;

        if (!name || !sku || quantity === undefined) {
            return res.status(400).json({ error: "name, sku, quantity required" });
        }
        if (safeQty === null || safeQty < 0) {
            return res.status(400).json({ error: "quantity must be >= 0" });
        }

        try {
            const { rows } = await pool.query(
                "INSERT INTO items (name, sku, description, price, quantity) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, sku, description, price, quantity",
                [name, sku, description, safePrice, safeQty]
            );
            return res.status(201).json(rows[0]);
        } catch (err) {
            if (err.code === "23505") {
                return res.status(409).json({ error: "sku must be unique" });
            }
            console.error(err);
            return res.status(500).json({ error: "Server Error" });
        }
    });

    app.post("/items/:id/adjust", async (req, res) => {
        const id = Number(req.params.id);
        const delta = Number(req.body?.delta);

        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "invalid id" });
        if (!Number.isInteger(delta) || delta === 0)
            return res.status(400).json({ error: "delta must be non-zero integer" });

        try {
            const { rows: existingRows } = await pool.query(
                "SELECT id, name, sku, description, price, quantity FROM items WHERE id = $1",
                [id]
            );
            const item = existingRows[0];
            if (!item) return res.status(404).json({ error: "not found" });

            const newQty = item.quantity + delta;
            if (newQty < 0) return res.status(400).json({ error: "quantity cannot go below 0" });

            const { rows } = await pool.query(
                "UPDATE items SET quantity = $1 WHERE id = $2 RETURNING id, name, sku, description, price, quantity",
                [newQty, id]
            );
            return res.json(rows[0]);
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server Error" });
        }
    });

    app.delete("/items", (req, res) => res.status(400).json({ error: "invalid id" }));
    app.delete("/items/", (req, res) => res.status(400).json({ error: "invalid id" }));

    app.delete("/items/:id", async (req, res) => {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: "invalid id" });
        }

        try {
            const { rowCount } = await pool.query("DELETE FROM items WHERE id = $1", [id]);
            if (rowCount === 0) {
                return res.status(404).json({ error: "not found" });
            }
            return res.status(200).json({ success: true });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Server Error" });
        }
    });
    //Done by Margaret (24020804)
    app.post("/addItem", async (req, res) => {
        const { name, description, price, quantity } = req.body || {};

        if (!name || quantity === undefined || quantity === "" || quantity === null) {
            return res.status(400).send("Name and quantity required");
        }

        const numericQty = Number(quantity);
        const safeQty = Number.isFinite(numericQty) ? Math.round(numericQty) : null;
        const numericPrice = price !== undefined ? Number(price) : 0;
        const safePrice = Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : 0;
        if (safeQty === null || safeQty < 0) {
            return res.status(400).send("Quantity must be a non-negative number");
        }

        const sku = name.replace(/\s+/g, "-").toUpperCase() + "-" + Date.now();

        try {
            await pool.query(
                "INSERT INTO items (name, sku, description, price, quantity) VALUES ($1, $2, $3, $4, $5)",
                [name, sku, description || "", safePrice, safeQty]
            );
            return res.status(200).send("Item added successfully");
        } catch (err) {
            console.error(err);
            return res.status(500).send("Server Error");
        }
    });

    app.get("/items/:id", async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "invalid id" });
        }

        try {
            const { rows } = await pool.query(
                "SELECT id, name, sku, description, price, quantity FROM items WHERE id = $1",
                [id]
            );
            const item = rows[0];
            if (!item) {
                return res.status(404).json({ error: "not found" });
            }
            res.json(item);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Server Error" });
        }
    });

    app.post("/editItem/:id", async (req, res) => {
        const id = Number(req.params.id);
        const { name, sku, description, price, quantity } = req.body || {};

        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "invalid id" });
        }

        try {
            const { rows: existingRows } = await pool.query(
                "SELECT id, name, sku, description, price, quantity FROM items WHERE id = $1",
                [id]
            );
            const item = existingRows[0];
            if (!item) {
                return res.status(404).json({ error: "Item not found" });
            }

            if (quantity !== undefined && (!Number.isInteger(Number(quantity)) || Number(quantity) < 0)) {
                return res.status(400).json({ error: "quantity must be a non-negative integer" });
            }
            const numericPrice = price !== undefined ? Number(price) : item.price;
            if (Number.isNaN(numericPrice) || numericPrice < 0) {
                return res.status(400).json({ error: "price must be a number >= 0" });
            }

            const { rows } = await pool.query(
                `
                UPDATE items
                SET name = $1, sku = $2, description = $3, price = $4, quantity = $5
                WHERE id = $6
                RETURNING id, name, sku, description, price, quantity
                `,
                [
                    name ?? item.name,
                    sku ?? item.sku,
                    description ?? item.description,
                    numericPrice,
                    quantity ?? item.quantity,
                    id,
                ]
            );

            res.json(rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Server Error" });
        }
    });

    return app;
}

module.exports = { createApp };
