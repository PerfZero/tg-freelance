import { createHmac, timingSafeEqual } from "crypto";

import { HttpError } from "../../common/http-error";
import { assertValidation } from "../../common/validation";
import { env } from "../../config/env";

const WEB_APP_DATA_KEY = "WebAppData";
const MAX_AUTH_AGE_SECONDS = 60 * 60 * 24;

export type TelegramInitDataUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
};

export type VerifiedTelegramInitData = {
  authDate: number;
  queryId?: string;
  startParam?: string;
  user: TelegramInitDataUser;
};

const buildDataCheckString = (params: URLSearchParams): string =>
  [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

const toSecretKey = (botToken: string): Buffer =>
  createHmac("sha256", WEB_APP_DATA_KEY).update(botToken).digest();

const isValidHash = (value: string): boolean => /^[a-f0-9]{64}$/i.test(value);

const isSignatureValid = (providedHash: string, computedHash: string): boolean => {
  if (!isValidHash(providedHash) || !isValidHash(computedHash)) {
    return false;
  }

  const provided = Buffer.from(providedHash, "hex");
  const computed = Buffer.from(computedHash, "hex");

  if (provided.length !== computed.length) {
    return false;
  }

  return timingSafeEqual(provided, computed);
};

const parseUser = (rawValue: string): TelegramInitDataUser => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new HttpError(401, "UNAUTHORIZED", "initData user is malformed");
  }

  assertValidation(
    typeof parsed === "object" && parsed !== null && !Array.isArray(parsed),
    "initData user must be an object"
  );

  const user = parsed as Partial<TelegramInitDataUser>;

  assertValidation(
    typeof user.id === "number" && Number.isInteger(user.id) && user.id > 0,
    "initData user id is invalid"
  );
  assertValidation(
    typeof user.first_name === "string" && user.first_name.trim().length > 0,
    "initData user first_name is required"
  );

  if (user.last_name !== undefined) {
    assertValidation(typeof user.last_name === "string", "initData user last_name must be a string");
  }

  if (user.username !== undefined) {
    assertValidation(typeof user.username === "string", "initData user username must be a string");
  }

  return user as TelegramInitDataUser;
};

export const verifyTelegramInitData = (initData: string): VerifiedTelegramInitData => {
  assertValidation(typeof initData === "string" && initData.trim().length > 0, "initData is required");

  if (!env.telegramBotToken) {
    throw new HttpError(500, "INTERNAL_ERROR", "Telegram bot token is not configured");
  }

  const params = new URLSearchParams(initData);

  const providedHash = params.get("hash");
  if (!providedHash) {
    throw new HttpError(401, "UNAUTHORIZED", "initData hash is missing");
  }

  params.delete("hash");

  const dataCheckString = buildDataCheckString(params);
  const computedHash = createHmac("sha256", toSecretKey(env.telegramBotToken))
    .update(dataCheckString)
    .digest("hex");

  if (!isSignatureValid(providedHash, computedHash)) {
    throw new HttpError(401, "UNAUTHORIZED", "initData signature is invalid");
  }

  const authDateRaw = params.get("auth_date");
  const authDate = Number.parseInt(authDateRaw ?? "", 10);

  if (!Number.isInteger(authDate) || authDate <= 0) {
    throw new HttpError(401, "UNAUTHORIZED", "initData auth_date is invalid");
  }

  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > MAX_AUTH_AGE_SECONDS) {
    throw new HttpError(401, "UNAUTHORIZED", "initData is expired", {
      maxAgeSeconds: MAX_AUTH_AGE_SECONDS
    });
  }

  if (authDate - now > 60) {
    throw new HttpError(401, "UNAUTHORIZED", "initData auth_date is invalid");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new HttpError(401, "UNAUTHORIZED", "initData user is missing");
  }

  const user = parseUser(userRaw);

  return {
    authDate,
    queryId: params.get("query_id") ?? undefined,
    startParam: params.get("start_param") ?? undefined,
    user
  };
};
