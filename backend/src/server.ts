import { createApp } from "./app";
import { openDb } from "./db";

const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET ?? (isProduction ? "" : "dev-only-secret");
if (jwtSecret.length < 16) throw new Error("Set JWT_SECRET (at least 16 characters) in production");

const port = Number(process.env.PORT ?? 4000);
const app = createApp(openDb(process.env.DB_PATH ?? "dealership.db"), {
  jwtSecret,
  corsOrigin: process.env.CORS_ORIGIN,
});

app.listen(port, () => console.log(`API running on http://localhost:${port}`));
