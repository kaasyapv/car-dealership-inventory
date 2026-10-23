import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../services/authService";

const credentials = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72), // bcrypt ignores bytes past 72
});

export function authRoutes(auth: AuthService): Router {
  const router = Router();

  router.post("/register", async (req, res) => {
    const { email, password } = credentials.parse(req.body);
    res.status(201).json(await auth.register(email, password));
  });

  router.post("/login", async (req, res) => {
    const { email, password } = credentials.parse(req.body);
    res.json(await auth.login(email, password));
  });

  return router;
}
