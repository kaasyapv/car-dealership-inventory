import { createApp } from "./app";
import { loadConfig } from "./config";
import { openDb } from "./db";

const config = loadConfig(process.env);
const app = createApp(openDb(config.dbPath), config);

app.listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));
