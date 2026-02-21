import type {
  ExperienceLevelValue,
  PrimaryRoleValue,
  PublicUser,
  ExecutorProfileForm,
} from "../../entities/user/model/types";

export const toDelimitedList = (value: string): string[] =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const toExecutorProfileForm = (
  profile: PublicUser["profile"] | null,
): ExecutorProfileForm => ({
  about: profile?.about ?? "",
  skills: profile?.skills.join(", ") ?? "",
  portfolioLinks: profile?.portfolioLinks.join("\n") ?? "",
  basePrice: profile?.basePrice ? String(profile.basePrice) : "",
  experienceLevel: profile?.experienceLevel ?? "",
});

export const getExperienceLevelLabel = (
  value: ExperienceLevelValue | null,
): string => {
  if (value === "JUNIOR") {
    return "Junior";
  }

  if (value === "MIDDLE") {
    return "Middle";
  }

  if (value === "SENIOR") {
    return "Senior";
  }

  return "Не указан";
};

export const getExecutorProfileCheck = (
  profile: PublicUser["profile"] | null,
): { isComplete: boolean; missing: string[] } => {
  const missing: string[] = [];

  if (!profile?.about || profile.about.trim().length < 20) {
    missing.push("О себе (минимум 20 символов)");
  }

  if (!profile || profile.skills.length === 0) {
    missing.push("Навыки");
  }

  if (!profile || profile.portfolioLinks.length === 0) {
    missing.push("Портфолио (хотя бы 1 ссылка)");
  }

  if (!profile?.basePrice || profile.basePrice <= 0) {
    missing.push("Базовая ставка");
  }

  if (!profile?.experienceLevel) {
    missing.push("Уровень опыта");
  }

  return {
    isComplete: missing.length === 0,
    missing,
  };
};

export const getPreferredTabByRole = (role: PrimaryRoleValue | null) =>
  role === "CUSTOMER" ? "create" : "list";

export const toRoleLabel = (role: PrimaryRoleValue | null): string => {
  if (role === "CUSTOMER") {
    return "Чаще заказчик";
  }

  if (role === "EXECUTOR") {
    return "Чаще исполнитель";
  }

  return "Не выбран";
};
