import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import type { ErrorCode } from "../domain";
import { DomainError } from "../domain";

const STATUS: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  OUT_OF_STOCK: 409,
  EMAIL_TAKEN: 409,
  INVALID_CREDENTIALS: 401,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
};

/** Single place where errors become responses: `{ error, code }` (plus `details` for validation). */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof DomainError) {
    res.status(STATUS[err.code]).json({ error: err.message, code: err.code });
  } else if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", code: "VALIDATION_FAILED", details: err.issues });
  } else if ((err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: "Malformed JSON body", code: "MALFORMED_JSON" });
  } else {
    console.error(err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL" });
  }
}
