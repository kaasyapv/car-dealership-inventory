import { createApp } from "./app";
import { openDb } from "./db";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET must be set in production");
}

const app = createApp(openDb(process.env.DB_PATH ?? "dealership.db"), {
  jwtSecret: jwtSecret ?? "dev-only-secret", // ponytail: fixed dev secret, required via env in production
});
const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
