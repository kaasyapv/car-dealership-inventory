import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import type { DatabaseSync } from "node:sqlite";
import { authRoutes, requireLogin } from "./auth";
import { ApiError, errorHandler } from "./errors";
import { vehicleRoutes } from "./vehicles";

export type AppConfig = {
  jwtSecret: string;
  bcryptRounds?: number;
  corsOrigin?: string;
  authRateLimit?: { max: number; windowMs: number };
};

// APP SETUP: middleware first, then the routes, then the error handler last
export function createApp(db: DatabaseSync, config: AppConfig) {
  const { jwtSecret, bcryptRounds = 10, corsOrigin = "*", authRateLimit = { max: 20, windowMs: 15 * 60_000 } } = config;
  const app = express();
  app.use(helmet(), cors({ origin: corsOrigin }), express.json());

  app.get("/api/health", (req, res) => {
    db.prepare("SELECT 1").get();
    res.json({ status: "ok" });
  });

  // login attempts are limited so passwords can't be guessed quickly
  const limiter = rateLimit({
    ...authRateLimit,
    handler: (req, res) => {
      res.status(429).json({ error: "Too many attempts, try again later", code: "RATE_LIMITED" });
    },
  });
  app.use("/api/auth", limiter, authRoutes(db, jwtSecret, bcryptRounds));
  app.use("/api/vehicles", requireLogin(jwtSecret), vehicleRoutes(db));
  app.use("/api", () => {
    throw new ApiError(404, "Route not found", "NOT_FOUND");
  });
  app.use(errorHandler);
  return app;
}
