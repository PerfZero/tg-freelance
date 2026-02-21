export type TgUser = {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
};

export type PrimaryRoleValue = "CUSTOMER" | "EXECUTOR";
export type ExperienceLevelValue = "JUNIOR" | "MIDDLE" | "SENIOR";

export type WebAppState = {
  isTelegram: boolean;
  platform: string;
  uiPlatform: "ios" | "base";
  appearance: "light" | "dark";
  version: string;
  colorScheme: string;
  initData: string;
  startParam?: string;
  user?: TgUser;
};

export type PublicUser = {
  id: string;
  telegramId: string;
  username: string | null;
  displayName: string;
  primaryRole: PrimaryRoleValue | null;
  roleFlags: unknown;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  profile: {
    about: string | null;
    skills: string[];
    portfolioLinks: string[];
    basePrice: number | null;
    experienceLevel: ExperienceLevelValue | null;
    botNotificationsEnabled: boolean;
    avatarUrl: string | null;
    hasCustomAvatar: boolean;
    rating: number;
    completedTasksCount: number;
  } | null;
};

export type ExecutorProfileForm = {
  about: string;
  skills: string;
  portfolioLinks: string;
  basePrice: string;
  experienceLevel: ExperienceLevelValue | "";
};
