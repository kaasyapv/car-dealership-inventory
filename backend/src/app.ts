import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import type { DatabaseSync } from "node:sqlite";
import { DomainError } from "./domain";
import { errorHandler } from "./http/errorHandler";
import { authRoutes } from "./http/authRoutes";
import { requireAdmin, requireAuth } from "./http/middleware";
import { inventoryRoutes } from "./http/inventoryRoutes";
import { vehicleRoutes } from "./http/vehicleRoutes";
import { SqliteUserRepository } from "./repositories/sqliteUserRepository";
import { SqliteVehicleRepository } from "./repositories/sqliteVehicleRepository";
import { BcryptHasher, JwtTokens } from "./security";
import { AuthService } from "./services/authService";
import { InventoryService } from "./services/inventoryService";

export interface AppConfig {
  jwtSecret: string;
  /** bcrypt cost; tests lower it for speed. */
  bcryptRounds?: number;
  /** Allowed origin for CORS; "*" (default) is fine for local development. */
  corsOrigin?: string;
  /** Brute-force guard on /api/auth/*. */
  authRateLimit?: { max: number; windowMs: number };
}

/** Composition root: the only place that knows which concrete classes implement each port. */
export function createApp(db: DatabaseSync, { jwtSecret, bcryptRounds, corsOrigin = "*", authRateLimit = { max: 20, windowMs: 15 * 60_000 } }: AppConfig) {
  const auth = new AuthService(new SqliteUserRepository(db), new BcryptHasher(bcryptRounds), new JwtTokens(jwtSecret));
  const vehicleRepo = new SqliteVehicleRepository(db);
  const inventory = new InventoryService(vehicleRepo, vehicleRepo);

  const app = express();
  app.use(helmet(), cors({ origin: corsOrigin, exposedHeaders: ["X-Total-Count"] }), express.json());

  app.get("/api/health", (_req, res) => {
    db.prepare("SELECT 1").get(); // throws (-> 500) if the database is unreachable
    res.json({ status: "ok" });
  });

  const authLimiter = rateLimit({
    ...authRateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: "Too many attempts, try again later", code: "RATE_LIMITED" });
    },
  });
  app.use("/api/auth", authLimiter, authRoutes(auth));
  app.use("/api/vehicles", requireAuth(auth), vehicleRoutes(inventory));
  app.use("/api/inventory", requireAuth(auth), requireAdmin, inventoryRoutes(inventory));
  app.use("/api", () => {
    throw new DomainError("NOT_FOUND", "Route not found");
  });
  app.use(errorHandler);
  return app;
}
