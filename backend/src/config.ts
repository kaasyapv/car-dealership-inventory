import { z } from "zod";

export interface Config {
  port: number;
  dbPath: string;
  jwtSecret: string;
  corsOrigin: string;
}

const DEV_SECRET = "dev-only-secret-do-not-use-in-production";

/** Parses and validates environment variables once, at startup, so misconfiguration fails fast and loudly. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const production = env.NODE_ENV === "production";
  const schema = z.object({
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DB_PATH: z.string().min(1).default("dealership.db"),
    CORS_ORIGIN: z.string().min(1).default("*"),
    JWT_SECRET: production
      ? z.string({ error: "JWT_SECRET is required in production" }).min(32, "JWT_SECRET must be at least 32 characters")
      : z.string().default(DEV_SECRET),
  });
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  const { PORT, DB_PATH, CORS_ORIGIN, JWT_SECRET } = parsed.data;
  return { port: PORT, dbPath: DB_PATH, corsOrigin: CORS_ORIGIN, jwtSecret: JWT_SECRET };
}
