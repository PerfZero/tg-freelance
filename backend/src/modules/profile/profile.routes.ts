import { Router } from "express";

import { HttpError } from "../../common/http-error";
import { assertBodyIsObject, assertValidation } from "../../common/validation";
import { prisma } from "../../config/prisma";
import { getAuthUser, requireAuth } from "../auth/auth.middleware";
import { mapPublicUser } from "../auth/auth.mapper";
import type { UserWithProfile } from "../auth/auth.types";

type ProfilePatchPayload = {
  display_name?: unknown;
  about?: unknown;
  skills?: unknown;
  portfolio_links?: unknown;
  base_price?: unknown;
  experience_level?: unknown;
  bot_notifications_enabled?: unknown;
  primary_role?: unknown;
  custom_avatar_data_url?: unknown;
};

const MAX_DISPLAY_NAME_LENGTH = 80;
const MAX_ABOUT_LENGTH = 2000;
const MAX_SKILLS = 30;
const MAX_SKILL_LENGTH = 40;
const MAX_PORTFOLIO_LINKS = 20;
const MAX_PORTFOLIO_LINK_LENGTH = 500;
const MAX_CUSTOM_AVATAR_DATA_URL_LENGTH = 1_500_000;
const PRIMARY_ROLES = ["CUSTOMER", "EXECUTOR"] as const;
const EXPERIENCE_LEVELS = ["JUNIOR", "MIDDLE", "SENIOR"] as const;
type PrimaryRoleValue = (typeof PRIMARY_ROLES)[number];
type ExperienceLevelValue = (typeof EXPERIENCE_LEVELS)[number];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: string): boolean => UUID_PATTERN.test(value);

const normalizeString = (value: string): string => value.trim();

const parseDisplayName = (
  value: unknown,
): { provided: boolean; normalized?: string } => {
  if (value === undefined) {
    return { provided: false };
  }

  assertValidation(typeof value === "string", "display_name must be a string");

  const normalized = normalizeString(value as string);

  assertValidation(normalized.length > 0, "display_name cannot be empty");
  assertValidation(
    normalized.length <= MAX_DISPLAY_NAME_LENGTH,
    `display_name must be at most ${MAX_DISPLAY_NAME_LENGTH} characters`,
  );

  return {
    provided: true,
    normalized,
  };
};

const parseAbout = (
  value: unknown,
): { provided: boolean; normalized?: string | null } => {
  if (value === undefined) {
    return { provided: false };
  }

  if (value === null) {
    return { provided: true, normalized: null };
  }

  assertValidation(typeof value === "string", "about must be a string or null");

  const normalized = normalizeString(value as string);

  assertValidation(
    normalized.length <= MAX_ABOUT_LENGTH,
    `about must be at most ${MAX_ABOUT_LENGTH} characters`,
  );

  return {
    provided: true,
    normalized: normalized.length > 0 ? normalized : null,
  };
};

const parseSkills = (
  value: unknown,
): { provided: boolean; normalized?: string[] } => {
  if (value === undefined) {
    return { provided: false };
  }

  assertValidation(Array.isArray(value), "skills must be an array of strings");

  const skillsInput = value as unknown[];

  const normalized = skillsInput.map((entry, index) => {
    assertValidation(
      typeof entry === "string",
      `skills[${index}] must be a string`,
    );

    const skill = normalizeString(entry as string);

    assertValidation(skill.length > 0, `skills[${index}] cannot be empty`);
    assertValidation(
      skill.length <= MAX_SKILL_LENGTH,
      `skills[${index}] must be at most ${MAX_SKILL_LENGTH} characters`,
    );

    return skill;
  });

  assertValidation(
    normalized.length <= MAX_SKILLS,
    `skills must contain at most ${MAX_SKILLS} items`,
  );

  return {
    provided: true,
    normalized,
  };
};

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const parsePortfolioLinks = (
  value: unknown,
): { provided: boolean; normalized?: string[] } => {
  if (value === undefined) {
    return { provided: false };
  }

  assertValidation(
    Array.isArray(value),
    "portfolio_links must be an array of strings",
  );

  const normalized = (value as unknown[]).map((entry, index) => {
    assertValidation(
      typeof entry === "string",
      `portfolio_links[${index}] must be a string`,
    );

    const link = normalizeString(entry as string);

    assertValidation(
      link.length > 0,
      `portfolio_links[${index}] cannot be empty`,
    );
    assertValidation(
      link.length <= MAX_PORTFOLIO_LINK_LENGTH,
      `portfolio_links[${index}] must be at most ${MAX_PORTFOLIO_LINK_LENGTH} characters`,
    );
    assertValidation(
      isHttpUrl(link),
      `portfolio_links[${index}] must be a valid http/https URL`,
    );

    return link;
  });

  assertValidation(
    normalized.length <= MAX_PORTFOLIO_LINKS,
    `portfolio_links must contain at most ${MAX_PORTFOLIO_LINKS} items`,
  );

  return {
    provided: true,
    normalized,
  };
};

const parseBasePrice = (
  value: unknown,
): { provided: boolean; normalized?: string | null } => {
  if (value === undefined) {
    return { provided: false };
  }

  if (value === null) {
    return { provided: true, normalized: null };
  }

  assertValidation(
    typeof value === "string" || typeof value === "number",
    "base_price must be a number or null",
  );

  const parsed = Number(value);

  assertValidation(Number.isFinite(parsed), "base_price must be a number");
  assertValidation(parsed > 0, "base_price must be greater than 0");

  return {
    provided: true,
    normalized: String(parsed),
  };
};

const parseExperienceLevel = (
  value: unknown,
): { provided: boolean; normalized?: ExperienceLevelValue | null } => {
  if (value === undefined) {
    return { provided: false };
  }

  if (value === null) {
    return { provided: true, normalized: null };
  }

  assertValidation(
    typeof value === "string",
    "experience_level must be JUNIOR, MIDDLE, SENIOR or null",
  );

  const normalized = normalizeString(value as string).toUpperCase();

  assertValidation(
    EXPERIENCE_LEVELS.includes(normalized as ExperienceLevelValue),
    "experience_level must be JUNIOR, MIDDLE or SENIOR",
  );

  return {
    provided: true,
    normalized: normalized as ExperienceLevelValue,
  };
};

const parseBotNotificationsEnabled = (
  value: unknown,
): { provided: boolean; normalized?: boolean } => {
  if (value === undefined) {
    return { provided: false };
  }

  assertValidation(
    typeof value === "boolean",
    "bot_notifications_enabled must be a boolean",
  );

  return {
    provided: true,
    normalized: value as boolean,
  };
};

const parsePrimaryRole = (
  value: unknown,
): { provided: boolean; normalized?: PrimaryRoleValue | null } => {
  if (value === undefined) {
    return { provided: false };
  }

  if (value === null) {
    return { provided: true, normalized: null };
  }

  assertValidation(
    typeof value === "string",
    "primary_role must be CUSTOMER, EXECUTOR or null",
  );

  const normalized = normalizeString(value as string).toUpperCase();

  assertValidation(
    PRIMARY_ROLES.includes(normalized as PrimaryRoleValue),
    "primary_role must be CUSTOMER or EXECUTOR",
  );

  return {
    provided: true,
    normalized: normalized as PrimaryRoleValue,
  };
};

const CUSTOM_AVATAR_DATA_URL_PATTERN =
  /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i;

const parseCustomAvatarDataUrl = (
  value: unknown,
): { provided: boolean; normalized?: string | null } => {
  if (value === undefined) {
    return { provided: false };
  }

  if (value === null) {
    return { provided: true, normalized: null };
  }

  assertValidation(
    typeof value === "string",
    "custom_avatar_data_url must be a string or null",
  );

  const normalized = normalizeString(value as string);

  assertValidation(
    normalized.length <= MAX_CUSTOM_AVATAR_DATA_URL_LENGTH,
    `custom_avatar_data_url must be at most ${MAX_CUSTOM_AVATAR_DATA_URL_LENGTH} characters`,
  );

  assertValidation(
    CUSTOM_AVATAR_DATA_URL_PATTERN.test(normalized),
    "custom_avatar_data_url must be a valid image data URL",
  );

  return {
    provided: true,
    normalized,
  };
};

const getUserById = async (userId: string): Promise<UserWithProfile> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    throw new HttpError(404, "NOT_FOUND", "User not found");
  }

  return user;
};

const patchProfile = async (
  userId: string,
  payload: ProfilePatchPayload,
): Promise<UserWithProfile> => {
  const parsedDisplayName = parseDisplayName(payload.display_name);
  const parsedAbout = parseAbout(payload.about);
  const parsedSkills = parseSkills(payload.skills);
  const parsedPortfolioLinks = parsePortfolioLinks(payload.portfolio_links);
  const parsedBasePrice = parseBasePrice(payload.base_price);
  const parsedExperienceLevel = parseExperienceLevel(payload.experience_level);
  const parsedBotNotificationsEnabled = parseBotNotificationsEnabled(
    payload.bot_notifications_enabled,
  );
  const parsedPrimaryRole = parsePrimaryRole(payload.primary_role);
  const parsedCustomAvatarDataUrl = parseCustomAvatarDataUrl(
    payload.custom_avatar_data_url,
  );

  const hasUpdates =
    parsedDisplayName.provided ||
    parsedAbout.provided ||
    parsedSkills.provided ||
    parsedPortfolioLinks.provided ||
    parsedBasePrice.provided ||
    parsedExperienceLevel.provided ||
    parsedBotNotificationsEnabled.provided ||
    parsedPrimaryRole.provided ||
    parsedCustomAvatarDataUrl.provided;

  assertValidation(hasUpdates, "No valid fields to update");

  if (parsedDisplayName.provided) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: parsedDisplayName.normalized,
      },
    });
  }

  if (
    parsedAbout.provided ||
    parsedSkills.provided ||
    parsedPortfolioLinks.provided ||
    parsedBasePrice.provided ||
    parsedExperienceLevel.provided ||
    parsedBotNotificationsEnabled.provided ||
    parsedPrimaryRole.provided ||
    parsedCustomAvatarDataUrl.provided
  ) {
    await prisma.profile.upsert({
      where: { userId },
      update: {
        ...(parsedAbout.provided ? { about: parsedAbout.normalized } : {}),
        ...(parsedSkills.provided ? { skills: parsedSkills.normalized } : {}),
        ...(parsedPortfolioLinks.provided
          ? { portfolioLinks: parsedPortfolioLinks.normalized }
          : {}),
        ...(parsedBasePrice.provided
          ? { basePrice: parsedBasePrice.normalized }
          : {}),
        ...(parsedExperienceLevel.provided
          ? { experienceLevel: parsedExperienceLevel.normalized }
          : {}),
        ...(parsedBotNotificationsEnabled.provided
          ? {
              botNotificationsEnabled: parsedBotNotificationsEnabled.normalized,
            }
          : {}),
        ...(parsedPrimaryRole.provided
          ? { primaryRole: parsedPrimaryRole.normalized }
          : {}),
        ...(parsedCustomAvatarDataUrl.provided
          ? { customAvatarDataUrl: parsedCustomAvatarDataUrl.normalized }
          : {}),
      },
      create: {
        userId,
        about: parsedAbout.provided ? parsedAbout.normalized : null,
        skills: parsedSkills.provided ? (parsedSkills.normalized ?? []) : [],
        portfolioLinks: parsedPortfolioLinks.provided
          ? (parsedPortfolioLinks.normalized ?? [])
          : [],
        basePrice: parsedBasePrice.provided ? parsedBasePrice.normalized : null,
        experienceLevel: parsedExperienceLevel.provided
          ? parsedExperienceLevel.normalized
          : null,
        botNotificationsEnabled: parsedBotNotificationsEnabled.provided
          ? parsedBotNotificationsEnabled.normalized
          : true,
        primaryRole: parsedPrimaryRole.provided
          ? parsedPrimaryRole.normalized
          : null,
        customAvatarDataUrl: parsedCustomAvatarDataUrl.provided
          ? parsedCustomAvatarDataUrl.normalized
          : null,
      },
    });
  }

  return getUserById(userId);
};

export const profileRouter = Router();

profileRouter.get("/me", requireAuth, async (_req, res, next) => {
  try {
    const authUser = getAuthUser(res);
    const user = await getUserById(authUser.id);

    res.status(200).json({
      user: mapPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    assertBodyIsObject(req.body);

    const authUser = getAuthUser(res);
    const user = await patchProfile(
      authUser.id,
      req.body as ProfilePatchPayload,
    );

    res.status(200).json({
      user: mapPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.get("/platform-stats", requireAuth, async (_req, res, next) => {
  try {
    const totalUsers = await prisma.user.count();

    res.status(200).json({
      totalUsers,
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.get("/:userId", requireAuth, async (req, res, next) => {
  try {
    const userIdRaw = req.params.userId;

    assertValidation(
      typeof userIdRaw === "string",
      "userId must be a valid UUID",
    );

    const userId = userIdRaw as string;

    assertValidation(isUuid(userId), "userId must be a valid UUID");

    const user = await getUserById(userId);

    res.status(200).json({
      user: mapPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
});
