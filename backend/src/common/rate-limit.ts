import type { NextFunction, Request, Response } from "express";

import { HttpError } from "./http-error";

type RateLimitConfig = {
  scope: string;
  windowMs: number;
  maxRequests: number;
  message: string;
};

type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

const pruneBucket = (bucket: Bucket, now: number, windowMs: number): void => {
  bucket.timestamps = bucket.timestamps.filter(
    (timestamp) => now - timestamp < windowMs,
  );
};

const assertValidConfig = (config: RateLimitConfig): void => {
  if (!Number.isFinite(config.windowMs) || config.windowMs <= 0) {
    throw new Error(`Invalid rate limit window for scope "${config.scope}"`);
  }

  if (!Number.isFinite(config.maxRequests) || config.maxRequests <= 0) {
    throw new Error(`Invalid rate limit maxRequests for scope "${config.scope}"`);
  }
};

export const createInMemoryRateLimit = (
  config: RateLimitConfig,
  resolveKey: (req: Request, res: Response) => string,
) => {
  assertValidConfig(config);

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const rawKey = resolveKey(req, res);
      const normalizedKey = rawKey.trim();

      if (!normalizedKey) {
        throw new HttpError(
          500,
          "INTERNAL_ERROR",
          `Rate limit key is empty for scope "${config.scope}"`,
        );
      }

      const now = Date.now();
      const key = `${config.scope}:${normalizedKey}`;
      const currentBucket = buckets.get(key) ?? { timestamps: [] };

      pruneBucket(currentBucket, now, config.windowMs);

      if (currentBucket.timestamps.length >= config.maxRequests) {
        const oldestTimestamp = currentBucket.timestamps[0] ?? now;
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((oldestTimestamp + config.windowMs - now) / 1000),
        );

        res.setHeader("Retry-After", String(retryAfterSeconds));

        throw new HttpError(429, "RATE_LIMITED", config.message, {
          scope: config.scope,
          maxRequests: config.maxRequests,
          windowMs: config.windowMs,
          retryAfterSeconds,
        });
      }

      currentBucket.timestamps.push(now);
      buckets.set(key, currentBucket);

      next();
    } catch (error) {
      next(error);
    }
  };
};
