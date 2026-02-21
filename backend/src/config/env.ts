import dotenv from "dotenv";

dotenv.config();

const toInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toInt(process.env.PORT, 3001),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  jwtSecret: process.env.JWT_SECRET ?? ""
};
