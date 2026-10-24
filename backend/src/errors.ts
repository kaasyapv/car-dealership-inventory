import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

// ERRORS: throw ApiError anywhere; errorHandler turns it into a JSON response
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string,
  ) {
    super(message);
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, code: err.code });
  } else if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid input", code: "VALIDATION_FAILED", details: err.issues });
  } else if ((err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: "Malformed JSON body", code: "MALFORMED_JSON" });
  } else {
    console.error(err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL" });
  }
}
