import type { DatabaseSync } from "node:sqlite";
import { loadConfig } from "./config";
import { openDb } from "./db";
import { SqliteUserRepository } from "./repositories/sqliteUserRepository";
import { SqliteVehicleRepository } from "./repositories/sqliteVehicleRepository";
import { BcryptHasher } from "./security";

/** Demo credentials: printed by the CLI and documented in the README. Never use these in production. */
export const DEMO_PASSWORD = "password123";
const DEMO_USERS = ["admin@showroom.dev", "shopper@showroom.dev"]; // first user created becomes admin

const DEMO_VEHICLES = [
  ["Honda", "Civic", "Sedan", 22000, 5],
  ["Toyota", "Camry", "Sedan", 28500, 3],
  ["BMW", "M3", "Sedan", 78000, 1],
  ["Tesla", "Model 3", "Sedan", 40000, 0],
  ["Ford", "F-150", "Truck", 45000, 2],
  ["Chevrolet", "Silverado", "Truck", 48500, 4],
  ["Ram", "1500", "Truck", 47000, 6],
  ["Toyota", "RAV4", "SUV", 32500, 7],
  ["Jeep", "Wrangler", "SUV", 38000, 4],
  ["Subaru", "Outback", "SUV", 34000, 3],
  ["Volvo", "XC60", "SUV", 51000, 2],
  ["Mazda", "MX-5", "Convertible", 31000, 2],
  ["Porsche", "911", "Coupe", 115000, 1],
  ["Ford", "Mustang", "Coupe", 42000, 3],
  ["Volkswagen", "Golf", "Hatchback", 24000, 8],
  ["Nissan", "Leaf", "Hatchback", 29000, 0],
] as const;

/** Idempotent: only fills tables that are still empty. */
export async function seedDemoData(db: DatabaseSync, bcryptRounds = 10) {
  const empty = (table: string) => !db.prepare(`SELECT 1 FROM ${table} LIMIT 1`).get();
  if (empty("users")) {
    const users = new SqliteUserRepository(db);
    const hasher = new BcryptHasher(bcryptRounds);
    for (const email of DEMO_USERS) users.create(email, await hasher.hash(DEMO_PASSWORD));
  }
  if (empty("vehicles")) {
    const vehicles = new SqliteVehicleRepository(db);
    for (const [make, model, category, price, quantity] of DEMO_VEHICLES) {
      vehicles.insert({ make, model, category, price, quantity });
    }
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  const { dbPath } = loadConfig(process.env);
  await seedDemoData(openDb(dbPath));
  console.log(`Seeded ${dbPath}\n  admin:   ${DEMO_USERS[0]} / ${DEMO_PASSWORD}\n  shopper: ${DEMO_USERS[1]} / ${DEMO_PASSWORD}`);
}
