import { createApp } from "./app";
import { openDb } from "./db";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("Set JWT_SECRET before running in production");
}
const jwtSecret = process.env.JWT_SECRET ?? "dev-only-secret-not-for-production";

const port = Number(process.env.PORT ?? 4000);
const app = createApp(openDb(process.env.DB_PATH ?? "dealership.db"), {
  jwtSecret,
  corsOrigin: process.env.CORS_ORIGIN,
});

app.listen(port, () => console.log(`API running on http://localhost:${port}`));
