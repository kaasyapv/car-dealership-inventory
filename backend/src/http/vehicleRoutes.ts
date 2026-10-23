import { Router } from "express";
import { z } from "zod";
import type { InventoryService } from "../services/inventoryService";
import { requireAdmin } from "./middleware";

const text = z.string().trim().min(1).max(100);
const vehicleInput = z.object({
  make: text,
  model: text,
  category: text,
  price: z.number().min(0),
  quantity: z.number().int().min(0),
});
const restockInput = z.object({ amount: z.number().int().positive() });
const searchQuery = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});
const parseId = (raw: unknown) => z.coerce.number().int().positive().parse(raw);

/** Thin HTTP adapter: validate input, call the service, shape the response. Auth is applied by the caller. */
export function vehicleRoutes(inventory: InventoryService): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(inventory.search().items);
  });

  // Declared before "/:id" routes so "search" is not parsed as an id.
  router.get("/search", (req, res) => {
    res.json(inventory.search(searchQuery.parse(req.query)).items);
  });

  router.post("/", requireAdmin, (req, res) => {
    res.status(201).json(inventory.create(vehicleInput.parse(req.body)));
  });

  router.put("/:id", requireAdmin, (req, res) => {
    res.json(inventory.update(parseId(req.params.id), vehicleInput.partial().parse(req.body)));
  });

  router.delete("/:id", requireAdmin, (req, res) => {
    inventory.remove(parseId(req.params.id));
    res.status(204).end();
  });

  router.post("/:id/purchase", (req, res) => {
    res.json(inventory.purchase(parseId(req.params.id)));
  });

  router.post("/:id/restock", requireAdmin, (req, res) => {
    res.json(inventory.restock(parseId(req.params.id), restockInput.parse(req.body).amount));
  });

  return router;
}
