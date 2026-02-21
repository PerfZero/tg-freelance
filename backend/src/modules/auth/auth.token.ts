import jwt from "jsonwebtoken";

import { HttpError } from "../../common/http-error";
import { env } from "../../config/env";

const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export type AuthTokenPayload = {
  sub: string;
  telegramId: string;
};

const getSecret = (): string => {
  if (!env.jwtSecret) {
    throw new HttpError(500, "INTERNAL_ERROR", "JWT secret is not configured");
  }

  return env.jwtSecret;
};

export const signAuthToken = (payload: AuthTokenPayload): string =>
  jwt.sign(payload, getSecret(), {
    expiresIn: AUTH_TOKEN_TTL_SECONDS
  });

export const verifyAuthToken = (token: string): AuthTokenPayload => {
  try {
    const decoded = jwt.verify(token, getSecret());

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.sub !== "string" ||
      typeof decoded.telegramId !== "string"
    ) {
      throw new HttpError(401, "UNAUTHORIZED", "Invalid auth token payload");
    }

    return {
      sub: decoded.sub,
      telegramId: decoded.telegramId
    };
  } catch {
    throw new HttpError(401, "UNAUTHORIZED", "Invalid auth token");
  }
};
