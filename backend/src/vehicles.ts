import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { requireAdmin, requireAuth } from "./auth";
import { HttpError } from "./http";

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
}

const text = z.string().trim().min(1).max(100);
const vehicleInput = z.object({
  make: text,
  model: text,
  category: text,
  price: z.number().min(0),
  quantity: z.number().int().min(0),
});
const vehicleUpdate = vehicleInput.partial();
const restockInput = z.object({ amount: z.number().int().positive() });
const searchQuery = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});

const parseId = (raw: unknown) => z.coerce.number().int().positive().parse(raw);

/** Escapes LIKE wildcards so user input is matched literally. */
const contains = (s: string) => `%${s.replace(/[\\%_]/g, "\\$&")}%`;

/** Vehicle catalogue and inventory routes; every route requires a logged-in user. */
export function vehicleRouter(db: DatabaseSync, secret: string): Router {
  const router = Router();
  router.use(requireAuth(secret));

  const find = (id: number) => db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id) as Vehicle | undefined;
  const get = (id: number): Vehicle => {
    const vehicle = find(id);
    if (!vehicle) throw new HttpError(404, "Vehicle not found");
    return vehicle;
  };

  router.get("/", (_req, res) => {
    res.json(db.prepare("SELECT * FROM vehicles ORDER BY id").all());
  });

  // Declared before "/:id" routes so "search" is not parsed as an id.
  router.get("/search", (req, res) => {
    const q = searchQuery.parse(req.query);
    const clauses: string[] = [];
    const params: (string | number)[] = [];
    for (const col of ["make", "model", "category"] as const) {
      const value = q[col];
      if (value) {
        clauses.push(`${col} LIKE ? ESCAPE '\\'`);
        params.push(contains(value));
      }
    }
    if (q.minPrice !== undefined) (clauses.push("price >= ?"), params.push(q.minPrice));
    if (q.maxPrice !== undefined) (clauses.push("price <= ?"), params.push(q.maxPrice));
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    res.json(db.prepare(`SELECT * FROM vehicles ${where} ORDER BY id`).all(...params));
  });

  router.post("/", requireAdmin, (req, res) => {
    const v = vehicleInput.parse(req.body);
    const { lastInsertRowid } = db
      .prepare("INSERT INTO vehicles (make, model, category, price, quantity) VALUES (?, ?, ?, ?, ?)")
      .run(v.make, v.model, v.category, v.price, v.quantity);
    res.status(201).json(get(Number(lastInsertRowid)));
  });

  router.put("/:id", requireAdmin, (req, res) => {
    const id = parseId(req.params.id);
    const current = get(id);
    const v = { ...current, ...vehicleUpdate.parse(req.body) };
    db.prepare("UPDATE vehicles SET make = ?, model = ?, category = ?, price = ?, quantity = ? WHERE id = ?").run(
      v.make, v.model, v.category, v.price, v.quantity, id,
    );
    res.json(get(id));
  });

  router.delete("/:id", requireAdmin, (req, res) => {
    const { changes } = db.prepare("DELETE FROM vehicles WHERE id = ?").run(parseId(req.params.id));
    if (!changes) throw new HttpError(404, "Vehicle not found");
    res.status(204).end();
  });

  router.post("/:id/purchase", (req, res) => {
    const id = parseId(req.params.id);
    // Single conditional UPDATE keeps stock from going negative under concurrent purchases.
    const { changes } = db.prepare("UPDATE vehicles SET quantity = quantity - 1 WHERE id = ? AND quantity > 0").run(id);
    if (!changes) {
      get(id); // 404 if it doesn't exist
      throw new HttpError(409, "Vehicle is out of stock");
    }
    res.json(get(id));
  });

  router.post("/:id/restock", requireAdmin, (req, res) => {
    const id = parseId(req.params.id);
    const { amount } = restockInput.parse(req.body);
    get(id);
    db.prepare("UPDATE vehicles SET quantity = quantity + ? WHERE id = ?").run(amount, id);
    res.json(get(id));
  });

  return router;
}
