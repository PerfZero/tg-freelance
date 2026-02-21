import dotenv from "dotenv";

dotenv.config();

const toInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toStringList = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toInt(process.env.PORT, 3001),
  databaseUrl: process.env.DATABASE_URL ?? "",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  taskCreateRateLimitPerWindow: toInt(
    process.env.TASK_CREATE_RATE_LIMIT_PER_WINDOW,
    5,
  ),
  proposalCreateRateLimitPerWindow: toInt(
    process.env.PROPOSAL_CREATE_RATE_LIMIT_PER_WINDOW,
    20,
  ),
  rateLimitWindowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
  adminTelegramIds: toStringList(process.env.ADMIN_TELEGRAM_IDS),
};
