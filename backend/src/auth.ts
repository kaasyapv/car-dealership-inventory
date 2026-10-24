import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { DatabaseSync } from "node:sqlite";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { ApiError } from "./errors";

export type User = { id: number; email: string; role: "admin" | "user" };

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

const credentials = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
});

// REGISTER AND LOGIN: POST /api/auth/register and /api/auth/login
export function authRoutes(db: DatabaseSync, secret: string, bcryptRounds: number) {
  const router = Router();

  const makeSession = (user: User) => ({
    token: jwt.sign(user, secret, { expiresIn: "8h" }),
    user,
  });

  router.post("/register", async (req, res) => {
    const { email, password } = credentials.parse(req.body);
    if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
      throw new ApiError(409, "Email already registered", "EMAIL_TAKEN");
    }
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
    const role = n === 0 ? "admin" : "user";
    const hash = await bcrypt.hash(password, bcryptRounds);
    const result = db.prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)").run(email, hash, role);
    res.status(201).json(makeSession({ id: Number(result.lastInsertRowid), email, role }));
  });

  router.post("/login", async (req, res) => {
    const { email, password } = credentials.parse(req.body);
    const row = db.prepare("SELECT id, email, role, password_hash FROM users WHERE email = ?").get(email) as
      | (User & { password_hash: string })
      | undefined;
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }
    res.json(makeSession({ id: row.id, email: row.email, role: row.role }));
  });

  return router;
}

// LOGIN CHECK: every vehicle route must carry a valid token
export const requireLogin = (secret: string) => (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new ApiError(401, "Missing token", "UNAUTHENTICATED");
  try {
    const { id, email, role } = jwt.verify(token, secret) as User;
    req.user = { id, email, role };
  } catch {
    throw new ApiError(401, "Invalid or expired token", "UNAUTHENTICATED");
  }
  next();
};

// ADMIN CHECK: add, update, delete and restock use this
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin") throw new ApiError(403, "Admin only", "FORBIDDEN");
  next();
};
