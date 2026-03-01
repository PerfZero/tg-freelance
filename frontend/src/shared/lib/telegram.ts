import WebApp from "@twa-dev/sdk";

import type { TgUser, WebAppState } from "../../entities/user/model/types";

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: {
      initData?: string;
      initDataUnsafe?: {
        user?: TgUser;
        start_param?: string;
      };
    };
  };
};

const getTelegramWebApp = () =>
  (window as TelegramWindow).Telegram?.WebApp;

const normalizeBotUsername = (value: string | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/^@/, "");
  return normalized.length > 0 ? normalized : null;
};

export const isTelegramWebAppContext = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const telegramWebApp = getTelegramWebApp();
  const hasInitData =
    typeof telegramWebApp?.initData === "string" &&
    telegramWebApp.initData.length > 0;

  return Boolean(hasInitData || telegramWebApp?.initDataUnsafe?.user);
};

export const getSafeState = (): WebAppState => {
  if (typeof window === "undefined" || !getTelegramWebApp()) {
    return {
      isTelegram: false,
      platform: "web",
      uiPlatform: "base",
      appearance: "light",
      version: "n/a",
      colorScheme: "light",
      initData: "",
    };
  }

  WebApp.ready();
  WebApp.expand();

  const initUser = WebApp.initDataUnsafe?.user;
  const hasInitData =
    typeof WebApp.initData === "string" && WebApp.initData.length > 0;
  const isTelegramContext = Boolean(hasInitData || initUser);

  return {
    isTelegram: isTelegramContext,
    platform: WebApp.platform,
    uiPlatform: WebApp.platform === "ios" ? "ios" : "base",
    appearance: WebApp.colorScheme === "dark" ? "dark" : "light",
    version: WebApp.version,
    colorScheme: WebApp.colorScheme,
    initData: WebApp.initData,
    startParam: WebApp.initDataUnsafe?.start_param,
    user: initUser
      ? {
          id: initUser.id,
          username: initUser.username,
          firstName: initUser.first_name,
          lastName: initUser.last_name,
        }
      : undefined,
  };
};

export const getAcronym = (user?: TgUser): string => {
  if (!user) {
    return "TG";
  }

  const first = user.firstName?.[0] ?? user.username?.[0] ?? "T";
  const second = user.lastName?.[0] ?? "G";

  return `${first}${second}`.toUpperCase();
};

export const getDisplayAcronym = (displayName: string): string => {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? "T"}${parts[1][0] ?? "G"}`.toUpperCase();
  }

  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return "TG";
};

export const getTelegramBotUsername = (): string | null => {
  const fromFrontendEnv = normalizeBotUsername(
    import.meta.env.VITE_TELEGRAM_BOT_USERNAME,
  );
  if (fromFrontendEnv) {
    return fromFrontendEnv;
  }

  return normalizeBotUsername(__TG_BOT_USERNAME__);
};

export const getTelegramBotUrl = (startApp = "landing"): string | null => {
  const botUsername = getTelegramBotUsername();
  if (!botUsername) {
    return null;
  }

  return `https://t.me/${botUsername}?startapp=${encodeURIComponent(startApp)}`;
};
