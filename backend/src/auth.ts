import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import jwt from "jsonwebtoken";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { HttpError } from "./http";

export type Role = "admin" | "user";
export interface AuthUser {
  id: number;
  email: string;
  role: Role;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

const credentials = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72), // bcrypt ignores bytes past 72
});

const sign = (user: AuthUser, secret: string) =>
  jwt.sign(user, secret, { expiresIn: "8h" });

/** Register/login routes. The very first registered user becomes the admin. */
export function authRouter(db: DatabaseSync, secret: string): Router {
  const router = Router();

  router.post("/register", async (req, res) => {
    const { email, password } = credentials.parse(req.body);
    if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
      throw new HttpError(409, "Email already registered");
    }
    const isFirst = !db.prepare("SELECT 1 FROM users LIMIT 1").get();
    const role: Role = isFirst ? "admin" : "user";
    const hash = await bcrypt.hash(password, 10);
    const { lastInsertRowid } = db
      .prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)")
      .run(email, hash, role);
    const user: AuthUser = { id: Number(lastInsertRowid), email, role };
    res.status(201).json({ token: sign(user, secret), user });
  });

  router.post("/login", async (req, res) => {
    const { email, password } = credentials.parse(req.body);
    const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
      | (AuthUser & { password_hash: string })
      | undefined;
    // Same message for unknown email and wrong password: don't reveal which emails exist.
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      throw new HttpError(401, "Invalid email or password");
    }
    const user: AuthUser = { id: row.id, email: row.email, role: row.role };
    res.json({ token: sign(user, secret), user });
  });

  return router;
}

/** Requires a valid bearer token; attaches the user to the request. */
export const requireAuth = (secret: string) => (req: Request, _res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, "Missing token");
  try {
    const { id, email, role } = jwt.verify(token, secret) as AuthUser;
    req.user = { id, email, role };
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
  next();
};

/** Requires the authenticated user to be an admin (use after requireAuth). */
export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin") throw new HttpError(403, "Admin only");
  next();
};
