import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env";
import { logger } from "./logger";
import { HttpError } from "./http-error";
import { getRequestId } from "./request-context";

const isJsonSyntaxError = (error: unknown): boolean =>
  error instanceof SyntaxError && "status" in error && "body" in error;

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const requestId = getRequestId(res);

  let knownError: HttpError;

  if (error instanceof HttpError) {
    knownError = error;
  } else if (isJsonSyntaxError(error)) {
    knownError = new HttpError(
      400,
      "VALIDATION_ERROR",
      "Invalid JSON payload",
      { path: req.path },
    );
  } else {
    knownError = new HttpError(500, "INTERNAL_ERROR", "Internal Server Error");
  }

  const details = {
    ...(knownError.details ?? {}),
    requestId,
  };

  const errorLogContext = {
    requestId,
    method: req.method,
    path: req.originalUrl,
    status: knownError.status,
    code: knownError.code,
    errorMessage: knownError.message,
    details,
  };

  if (knownError.status >= 500) {
    logger.error("audit.http_error_5xx", {
      ...errorLogContext,
      stack:
        error instanceof Error && env.nodeEnv !== "production"
          ? error.stack
          : undefined,
    });
  } else if (knownError.status >= 400) {
    logger.warn("audit.http_error_4xx", errorLogContext);
  }

  logger.error("request.error", {
    ...errorLogContext,
    stack:
      error instanceof Error && env.nodeEnv !== "production"
        ? error.stack
        : undefined,
  });

  res.status(knownError.status).json({
    error: {
      code: knownError.code,
      message: knownError.message,
      details,
    },
  });
};
