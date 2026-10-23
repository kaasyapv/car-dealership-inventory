import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";

describe("loadConfig", () => {
  it("falls back to development defaults", () => {
    expect(loadConfig({})).toMatchObject({ port: 4000, dbPath: "dealership.db", corsOrigin: "*" });
  });

  it("reads overrides from the environment", () => {
    const c = loadConfig({ PORT: "8080", DB_PATH: "/data/x.db", CORS_ORIGIN: "https://shop.example" });
    expect(c).toMatchObject({ port: 8080, dbPath: "/data/x.db", corsOrigin: "https://shop.example" });
  });

  it("refuses to start in production without a strong JWT_SECRET", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow(/JWT_SECRET/);
    expect(() => loadConfig({ NODE_ENV: "production", JWT_SECRET: "too-short" })).toThrow(/JWT_SECRET/);
    expect(loadConfig({ NODE_ENV: "production", JWT_SECRET: "x".repeat(32) }).jwtSecret).toBe("x".repeat(32));
  });

  it("rejects a nonsense PORT", () => {
    expect(() => loadConfig({ PORT: "abc" })).toThrow(/PORT/);
  });
});
