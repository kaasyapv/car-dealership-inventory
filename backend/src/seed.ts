import bcrypt from "bcryptjs";
import type { DatabaseSync } from "node:sqlite";
import { openDb } from "./db";

const DEMO_PASSWORD = "password123";
const DEMO_USERS = [
  ["admin@showroom.dev", "admin"],
  ["shopper@showroom.dev", "user"],
];

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

// SEED DATA: fills an empty database with demo users and cars (npm run seed)
export function seedDemoData(db: DatabaseSync, bcryptRounds = 10) {
  const isEmpty = (table: string) => !db.prepare(`SELECT 1 FROM ${table} LIMIT 1`).get();
  if (isEmpty("users")) {
    const hash = bcrypt.hashSync(DEMO_PASSWORD, bcryptRounds);
    for (const [email, role] of DEMO_USERS) {
      db.prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)").run(email, hash, role);
    }
  }
  if (isEmpty("vehicles")) {
    for (const car of DEMO_VEHICLES) {
      db.prepare("INSERT INTO vehicles (make, model, category, price, quantity) VALUES (?, ?, ?, ?, ?)").run(...car);
    }
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  const path = process.env.DB_PATH ?? "dealership.db";
  seedDemoData(openDb(path));
  console.log(`Seeded ${path}\n  admin:   admin@showroom.dev / ${DEMO_PASSWORD}\n  shopper: shopper@showroom.dev / ${DEMO_PASSWORD}`);
}
