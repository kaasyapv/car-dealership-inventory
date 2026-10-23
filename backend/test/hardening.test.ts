import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { openDb } from "../src/db";
import { makeApp } from "./helpers";

describe("operational endpoints and headers", () => {
  it("GET /api/health reports ok without auth", async () => {
    const res = await request(makeApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("sets security headers and hides the framework", async () => {
    const res = await request(makeApp()).get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("answers unknown API routes with a JSON 404", async () => {
    const res = await request(makeApp()).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Route not found", code: "NOT_FOUND" });
  });
});

describe("brute-force protection", () => {
  it("rate limits the auth endpoints, but not the rest of the API", async () => {
    const app = createApp(openDb(":memory:"), {
      jwtSecret: "test-secret",
      bcryptRounds: 4,
      authRateLimit: { max: 3, windowMs: 60_000 },
    });
    const attempt = () => request(app).post("/api/auth/login").send({ email: "a@x.com", password: "wrong-password" });
    expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("RATE_LIMITED");
    expect((await request(app).get("/api/health")).status).toBe(200);
  });
});
