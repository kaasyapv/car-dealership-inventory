import type { NextFunction, Request, Response } from "express";
import { DomainError, type User } from "../domain";
import type { AuthService } from "../services/authService";

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

/** Requires a valid bearer token and attaches the user to the request. */
export const requireAuth = (auth: AuthService) => (req: Request, _res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new DomainError("UNAUTHENTICATED", "Missing token");
  const user = auth.authenticate(token);
  if (!user) throw new DomainError("UNAUTHENTICATED", "Invalid or expired token");
  req.user = user;
  next();
};

/** Requires an admin (use after requireAuth). */
export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin") throw new DomainError("FORBIDDEN", "Admin only");
  next();
};
