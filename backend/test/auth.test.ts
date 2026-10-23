import request from "supertest";
import { describe, expect, it } from "vitest";
import { makeApp } from "./helpers";

describe("POST /api/auth/register", () => {
  it("creates a user and returns a token; first user is admin", async () => {
    const res = await request(makeApp()).post("/api/auth/register").send({ email: "a@x.com", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toEqual({ id: expect.any(Number), email: "a@x.com", role: "admin" });
  });

  it("makes later users regular users", async () => {
    const app = makeApp();
    await request(app).post("/api/auth/register").send({ email: "a@x.com", password: "password123" });
    const res = await request(app).post("/api/auth/register").send({ email: "b@x.com", password: "password123" });
    expect(res.body.user.role).toBe("user");
  });

  it("never returns the password hash", async () => {
    const res = await request(makeApp()).post("/api/auth/register").send({ email: "a@x.com", password: "password123" });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it("rejects a duplicate email with 409", async () => {
    const app = makeApp();
    await request(app).post("/api/auth/register").send({ email: "a@x.com", password: "password123" });
    const res = await request(app).post("/api/auth/register").send({ email: "A@x.com", password: "password123" });
    expect(res.status).toBe(409);
  });

  it.each([
    [{ email: "not-an-email", password: "password123" }],
    [{ email: "a@x.com", password: "short" }],
    [{}],
  ])("rejects invalid input %j with 400", async (body) => {
    const res = await request(makeApp()).post("/api/auth/register").send(body);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("returns a token for valid credentials", async () => {
    const app = makeApp();
    await request(app).post("/api/auth/register").send({ email: "a@x.com", password: "password123" });
    const res = await request(app).post("/api/auth/login").send({ email: "a@x.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it("rejects a wrong password and an unknown email identically with 401", async () => {
    const app = makeApp();
    await request(app).post("/api/auth/register").send({ email: "a@x.com", password: "password123" });
    const wrong = await request(app).post("/api/auth/login").send({ email: "a@x.com", password: "nope-nope-nope" });
    const unknown = await request(app).post("/api/auth/login").send({ email: "z@x.com", password: "password123" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });
});
