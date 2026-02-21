import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env";
import { HttpError } from "./http-error";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? {}
      }
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Internal Server Error";
  if (env.nodeEnv !== "test") {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message,
      details: {}
    }
  });
};
