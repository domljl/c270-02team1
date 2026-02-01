// Contributed by: Dominic (24021835), Vicknesh (24010102), Eisa (24011357), Margaret (24020804)

const express = require("express");
const path = require("path");

function createApp({ pool }) {
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, "public")));

    // Lightweight readiness probe for containers/CI. Done by Dominic (24021835)
    app.get("/health", (req, res) => {
        res.json({ status: "ok" });
    });

    // Lists all items, optionally filtered by a case-insensitive search on name/sku/description.
    // Done by Vicknesh (24010102)
    app.get("/items", async (req, res) => {
        try {
            // Extract search query from request parameters
            // Priority: req.query.query > req.query.q > empty string
            // Trim whitespace and convert to lowercase for case-insensitive search
            const q = (req.query.query || req.query.q || "").trim().toLowerCase();
            let rows;
            
            // Branch logic based on whether a search query was provided
            if (q) {
                // Query was provided: perform filtered search
                
                // Create SQL LIKE pattern with wildcards to match partial strings
                // E.g., "laptop" becomes "%laptop%"
                const like = `%${q}%`;
                
                // Execute parameterized SQL query to search across multiple fields
                // Uses lower() function to ensure case-insensitive matching in the database
                // Searches: name field, SKU field, description field
                // Results are ordered by id DESC (newest items first)
                // Parameterized query ($1, $2, $3) prevents SQL injection attacks
                const { rows: data } = await pool.query(
                    `SELECT id, name, sku, description, price, quantity
                     FROM items
                     WHERE lower(name) LIKE $1 OR lower(sku) LIKE $2 OR lower(description) LIKE $3
                     ORDER BY id DESC`,
                    [like, like, like] // Same search pattern used for all three fields
                );
                rows = data;
            } else {
                // No query provided: return all items
                
                // Execute simple query to fetch all items from database
                // Results are ordered by id DESC (newest items first)
                const { rows: data } = await pool.query(
                    "SELECT id, name, sku, description, price, quantity FROM items ORDER BY id DESC"
                );
                rows = data;
            }
            
            // Send results back to client as JSON array
            res.json(rows);
        } catch (err) {
            // Error handling: log error and send server error response
            
            // Log the error for debugging and monitoring purposes
            console.error(err);
            
            // Send HTTP 500 Internal Server Error with generic error message
            // Generic message prevents leaking sensitive database information to client
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

    // Delete Item route: Done by Dominic (24021835)
    // Guard rails: missing id segments return a 400 instead of hitting the DB.
    app.delete("/items", (req, res) => res.status(400).json({ error: "invalid id" }));
    app.delete("/items/", (req, res) => res.status(400).json({ error: "invalid id" }));

    // Deletes a single item by numeric id with validation and clear 404/500 responses.
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

    // /addItem POST route: Done by Margaret Pabustan (24020804)
    // Node.JS POST addItem route to add a new item to the inventory//
    app.post("/addItem", async (req, res) => {
    // Destructure values from the request body (Sent from the Add Item form)//
        const { name, description, price, quantity } = req.body || {};
    
    // Server-side validation - This ensures that required fields like "name" and "quantity" are provided and valid//
    //They must not be left empty or null//
        if (!name || quantity === undefined || quantity === "" || quantity === null) {
            return res.status(400).send("Name and quantity required");
        }
    //Convert quantity to number//
        const numericQty = Number(quantity);

    // Ensure quantity is a non-negative integer//
    // If number is invalid, set safeQty to null so that later validation can reject it.//
        const safeQty = Number.isFinite(numericQty) ? Math.round(numericQty) : null;

    //Convert price to number, default to 0 if price is not provided//
        const numericPrice = price !== undefined ? Number(price) : 0;
    
    // Ensure price is a valid non-negative number (>= 0)//
        const safePrice = Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : 0;
        if (safeQty === null || safeQty < 0) {
            return res.status(400).send("Quantity must be a non-negative number");
        }
    //Generate a unique SKU based on the item name and current timestamp//
    //Store the generated SKU in the variable "sku"//
    // Date.now() ensures uniqueness even if names are similar//
        const sku = name.replace(/\s+/g, "-").toUpperCase() + "-" + Date.now();

        try {
            //Insert the new item into the database using the SQL query INSERT INTO items...//
            //description || ensures that description is never null; defaults to empty string if not provided//
            await pool.query(
                "INSERT INTO items (name, sku, description, price, quantity) VALUES ($1, $2, $3, $4, $5)",
                [name, sku, description || "", safePrice, safeQty]
            );
        // If insertion is successful, send a success message to the user//
            return res.status(200).send("Item added successfully");
        } catch (err) {
        //Log any errors to the console for debugging purposes//
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

    // Edit Item route: Done by Eisa (24011357)
    app.post("/editItem/:id", async (req, res) => {
        // Convert URL parameter ":id" from string to number
        const id = Number(req.params.id);
        // Extract the fields to be updated from the request body
        const { name, sku, description, price, quantity } = req.body || {};

        // Validate ID: must be a valid integer
        // If ID is not a valid integer, return 400 Bad Request error
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "invalid id" });
        }

        try {
            // Fetch the existing item from database using the provided ID
            // This allows us to keep the current values for fields that are not being updated
            const { rows: existingRows } = await pool.query(
                "SELECT id, name, sku, description, price, quantity FROM items WHERE id = $1",
                [id]
            );
            // Get the first (and only) result from the query
            const item = existingRows[0];
            
            // Return 404 Not Found if the item doesn't exist in the database
            if (!item) {
                return res.status(404).json({ error: "Item not found" });
            }

            // Validate quantity if it was provided in the request body
            // Quantity must be a non-negative integer (0 or higher)
            if (quantity !== undefined && (!Number.isInteger(Number(quantity)) || Number(quantity) < 0)) {
                return res.status(400).json({ error: "quantity must be a non-negative integer" });
            }
            
            // Validate price if it was provided, otherwise use the existing price from the database
            // Price must be a valid non-negative number (>= 0)
            const numericPrice = price !== undefined ? Number(price) : item.price;
            if (Number.isNaN(numericPrice) || numericPrice < 0) {
                return res.status(400).json({ error: "price must be a number >= 0" });
            }

            // Update the item in the database using the nullish coalescing operator (??)
            // The ?? operator means: "if the left side is null/undefined, use the right side"
            // So: if a new value is provided (not null), use it; otherwise use the existing value
            const { rows } = await pool.query(
                `
                UPDATE items
                SET name = $1, sku = $2, description = $3, price = $4, quantity = $5
                WHERE id = $6
                RETURNING id, name, sku, description, price, quantity
                `,
                [
                    name ?? item.name,           // Use new name if provided, otherwise keep existing name
                    sku ?? item.sku,             // Use new SKU if provided, otherwise keep existing SKU
                    description ?? item.description, // Use new description if provided, otherwise keep existing
                    numericPrice,                // Use the validated/processed price value
                    quantity ?? item.quantity,   // Use new quantity if provided, otherwise keep existing quantity
                    id                           // The ID to identify which item to update
                ]
            );

            // Return the updated item as JSON response to the client
            res.json(rows[0]);
        } catch (err) {
            // Log the error to the console for debugging purposes
            console.error(err);
            // Return HTTP 500 Internal Server Error with generic error message
            res.status(500).json({ error: "Server Error" });
        }
    });

    return app;
}

module.exports = { createApp };

// Test