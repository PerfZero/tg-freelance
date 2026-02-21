import WebApp from "@twa-dev/sdk";

import type { TgUser, WebAppState } from "../../entities/user/model/types";

export const getSafeState = (): WebAppState => {
  if (
    typeof window === "undefined" ||
    !(window as Window & { Telegram?: unknown }).Telegram
  ) {
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
