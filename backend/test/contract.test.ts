import request from "supertest";
import { describe, expect, it } from "vitest";
import { openApiSpec } from "../src/openapi";
import { bearer, makeApp, register } from "./helpers";

type Method = "get" | "post" | "put" | "delete";

describe("OpenAPI contract", () => {
  it("is served as JSON", async () => {
    const res = await request(makeApp()).get("/api/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
  });

  it("serves interactive docs", async () => {
    expect((await request(makeApp()).get("/api/docs/")).status).toBe(200);
  });

  // Documentation that drifts from the code is worse than none: every documented operation must exist.
  const operations = Object.entries(openApiSpec.paths).flatMap(([path, item]) =>
    (Object.keys(item) as Method[]).map((method) => [method, path] as const),
  );

  it.each(operations)("%s %s is implemented", async (method, path) => {
    const app = makeApp();
    const token = await register(app, "admin@x.com");
    const res = await request(app)[method](path.replace(/\{id\}/g, "1")).set(bearer(token)).send({});
    expect(res.body.error).not.toBe("Route not found");
  });
});
