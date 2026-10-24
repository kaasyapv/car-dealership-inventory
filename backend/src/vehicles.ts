import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { ApiError } from "./errors";
import { requireAdmin } from "./auth";

export type Vehicle = { id: number; make: string; model: string; category: string; price: number; quantity: number };

const text = z.string().trim().min(1).max(100);
const vehicleSchema = z.object({
  make: text,
  model: text,
  category: text,
  price: z.number().min(0),
  quantity: z.number().int().min(0),
});
const searchSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  available: z.enum(["true", "false"]).optional(),
});
const restockSchema = z.object({ amount: z.number().int().positive() });
const idSchema = z.coerce.number().int().positive();

export function vehicleRoutes(db: DatabaseSync) {
  const router = Router();

  const getVehicle = (id: number) => db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id) as Vehicle | undefined;
  const mustGetVehicle = (id: number) => {
    const vehicle = getVehicle(id);
    if (!vehicle) throw new ApiError(404, "Vehicle not found", "NOT_FOUND");
    return vehicle;
  };

  // LIST AND SEARCH: GET /api/vehicles and /api/vehicles/search (same code)
  router.get(["/", "/search"], (req, res) => {
    const q = searchSchema.parse(req.query);
    const conditions: string[] = [];
    const values: (string | number)[] = [];
    if (q.make) (conditions.push("make LIKE ?"), values.push(`%${q.make}%`));
    if (q.model) (conditions.push("model LIKE ?"), values.push(`%${q.model}%`));
    if (q.category) (conditions.push("category LIKE ?"), values.push(`%${q.category}%`));
    if (q.minPrice !== undefined) (conditions.push("price >= ?"), values.push(q.minPrice));
    if (q.maxPrice !== undefined) (conditions.push("price <= ?"), values.push(q.maxPrice));
    if (q.available === "true") conditions.push("quantity > 0");
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    res.json(db.prepare(`SELECT * FROM vehicles ${where} ORDER BY id`).all(...values));
  });

  // ADD VEHICLE (admin): POST /api/vehicles
  router.post("/", requireAdmin, (req, res) => {
    const v = vehicleSchema.parse(req.body);
    const result = db
      .prepare("INSERT INTO vehicles (make, model, category, price, quantity) VALUES (?, ?, ?, ?, ?)")
      .run(v.make, v.model, v.category, v.price, v.quantity);
    res.status(201).json(getVehicle(Number(result.lastInsertRowid)));
  });

  // UPDATE VEHICLE (admin): PUT /api/vehicles/:id, only the fields you send change
  router.put("/:id", requireAdmin, (req, res) => {
    const id = idSchema.parse(req.params.id);
    const v = { ...mustGetVehicle(id), ...vehicleSchema.partial().parse(req.body) };
    db.prepare("UPDATE vehicles SET make = ?, model = ?, category = ?, price = ?, quantity = ? WHERE id = ?").run(
      v.make, v.model, v.category, v.price, v.quantity, id,
    );
    res.json(getVehicle(id));
  });

  // DELETE VEHICLE (admin): DELETE /api/vehicles/:id
  router.delete("/:id", requireAdmin, (req, res) => {
    const id = idSchema.parse(req.params.id);
    mustGetVehicle(id);
    db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
    res.status(204).end();
  });

  // PURCHASE: POST /api/vehicles/:id/purchase, takes one from stock but never below zero
  router.post("/:id/purchase", (req, res) => {
    const id = idSchema.parse(req.params.id);
    mustGetVehicle(id);
    const result = db.prepare("UPDATE vehicles SET quantity = quantity - 1 WHERE id = ? AND quantity > 0").run(id);
    if (result.changes === 0) throw new ApiError(409, "Vehicle is out of stock", "OUT_OF_STOCK");
    res.json(getVehicle(id));
  });

  // RESTOCK (admin): POST /api/vehicles/:id/restock, adds to stock
  router.post("/:id/restock", requireAdmin, (req, res) => {
    const id = idSchema.parse(req.params.id);
    const { amount } = restockSchema.parse(req.body);
    mustGetVehicle(id);
    db.prepare("UPDATE vehicles SET quantity = quantity + ? WHERE id = ?").run(amount, id);
    res.json(getVehicle(id));
  });

  return router;
}
