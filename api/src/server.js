// Done by Dominic (24021835)

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const { createApp } = require("./app");
const { pool, initDb } = require("./db");

const port = Number(process.env.PORT || 3000);
if (Number.isNaN(port)) {
    throw new Error("PORT must be a number");
}

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
