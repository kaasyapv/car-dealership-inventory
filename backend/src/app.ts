import cors from "cors";
import express from "express";
import type { DatabaseSync } from "node:sqlite";
import { errorHandler } from "./http/errorHandler";
import { authRoutes } from "./http/authRoutes";
import { requireAuth } from "./http/middleware";
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
  const inventory = new InventoryService(new SqliteVehicleRepository(db));

  const app = express();
  app.use(cors(), express.json());
  app.use("/api/auth", authRoutes(auth));
  app.use("/api/vehicles", requireAuth(auth), vehicleRoutes(inventory));
  app.use(errorHandler);
  return app;
}
