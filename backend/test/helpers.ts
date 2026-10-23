import request from "supertest";
import { createApp } from "../src/app";
import { openDb } from "../src/db";

/** Fresh app backed by an isolated SQLite database per test (":memory:" is test-only). */
export function makeApp() {
  return createApp(openDb(":memory:"), { jwtSecret: "test-secret", bcryptRounds: 4 });
}

type App = ReturnType<typeof makeApp>;

/** Registers a user and returns their bearer token. First user registered becomes admin. */
export async function register(app: App, email: string, password = "password123") {
  const res = await request(app).post("/api/auth/register").send({ email, password });
  return res.body.token as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
