import cors from "cors";
import express from "express";
import type { DatabaseSync } from "node:sqlite";
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
}

/** Composition root: the only place that knows which concrete classes implement each port. */
export function createApp(db: DatabaseSync, { jwtSecret, bcryptRounds }: AppConfig) {
  const auth = new AuthService(new SqliteUserRepository(db), new BcryptHasher(bcryptRounds), new JwtTokens(jwtSecret));
  const vehicleRepo = new SqliteVehicleRepository(db);
  const inventory = new InventoryService(vehicleRepo, vehicleRepo);

  const app = express();
  app.use(cors({ exposedHeaders: ["X-Total-Count"] }), express.json());
  app.use("/api/auth", authRoutes(auth));
  app.use("/api/vehicles", requireAuth(auth), vehicleRoutes(inventory));
  app.use("/api/inventory", requireAuth(auth), requireAdmin, inventoryRoutes(inventory));
  app.use(errorHandler);
  return app;
}
