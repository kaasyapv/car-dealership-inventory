import cors from "cors";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import type { DatabaseSync } from "node:sqlite";
import { ZodError } from "zod";
import { authRouter } from "./auth";
import { HttpError } from "./http";
import { vehicleRouter } from "./vehicles";

export interface AppConfig {
  jwtSecret: string;
}

/** Builds the Express app. The database is injected so tests can use an isolated one. */
export function createApp(db: DatabaseSync, { jwtSecret }: AppConfig) {
  const app = express();
  app.use(cors(), express.json());

  app.use("/api/auth", authRouter(db, jwtSecret));
  app.use("/api/vehicles", vehicleRouter(db, jwtSecret));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.issues });
    } else if ((err as { type?: string }).type === "entity.parse.failed") {
      res.status(400).json({ error: "Malformed JSON body" });
    } else if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return app;
}
