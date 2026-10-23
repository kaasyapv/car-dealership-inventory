import { Router } from "express";
import { z } from "zod";
import type { InventoryService } from "../services/inventoryService";

const eventsQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) });

/** Stock audit trail. Admin-only; the caller applies requireAuth + requireAdmin. */
export function inventoryRoutes(inventory: InventoryService): Router {
  const router = Router();
  router.get("/events", (req, res) => {
    res.json(inventory.activity(eventsQuery.parse(req.query).limit));
  });
  return router;
}
