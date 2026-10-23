import { describe, expect, it } from "vitest";
import { openDb } from "../src/db";
import { seedDemoData } from "../src/seed";

const count = (db: ReturnType<typeof openDb>, table: string) =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

describe("seedDemoData", () => {
  it("creates an admin, a shopper and a catalogue", async () => {
    const db = openDb(":memory:");
    await seedDemoData(db, 4);
    expect(count(db, "users")).toBe(2);
    expect(count(db, "vehicles")).toBeGreaterThanOrEqual(12);
    expect(db.prepare("SELECT role FROM users ORDER BY id").all()).toEqual([{ role: "admin" }, { role: "user" }]);
  });

  it("is idempotent", async () => {
    const db = openDb(":memory:");
    await seedDemoData(db, 4);
    await seedDemoData(db, 4);
    expect(count(db, "users")).toBe(2);
  });

  it("includes a sold-out vehicle so the disabled state is visible", async () => {
    const db = openDb(":memory:");
    await seedDemoData(db, 4);
    expect(count(db, "vehicles") > 0 && (db.prepare("SELECT 1 FROM vehicles WHERE quantity = 0").get() !== undefined)).toBe(true);
  });
});
