// Done by Dominic (24021835)

// Load environment variables from api/.env for local runs.
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const { createApp } = require("./app");
const { pool, initDb } = require("./db");

// Parse and validate the port up front.
const port = Number(process.env.PORT || 3000);
if (Number.isNaN(port)) {
    throw new Error("PORT must be a number");
}

// Bootstraps DB schema, creates the app, and starts listening.
async function start() {
    await initDb();
    const app = createApp({ pool });
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}

start().catch((err) => {
    console.error("Failed to start server", err);
    process.exit(1);
});
