import type { NextFunction, Request, Response } from "express";

import { logger } from "./logger";
import { getRequestId, getRequestStartNs } from "./request-context";

const toDurationMs = (startNs: bigint): number =>
  Number(process.hrtime.bigint() - startNs) / 1_000_000;

export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = getRequestId(res);
  const startNs = getRequestStartNs(res);

  logger.info("request.start", {
    requestId,
    method: req.method,
    path: req.originalUrl,
    userAgent: req.get("user-agent") ?? "unknown"
  });

  res.on("finish", () => {
    logger.info("request.finish", {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Number(toDurationMs(startNs).toFixed(2))
    });
  });

  next();
};
