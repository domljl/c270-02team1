const fs = require("fs");
const path = require("path");
const { createDbFromEnv } = require("./db");
const { createApp } = require("./app");

const port = Number(process.env.PORT || 3000);

const dbFile = process.env.DB_FILE || path.join(process.cwd(), "data", "inventory.sqlite");

fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = createDbFromEnv();
const app = createApp({ db });

app.listen(port, () => {
    console.log(`API listening on port ${port}`);
});
