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
  primary_role?: unknown;
};

const MAX_DISPLAY_NAME_LENGTH = 80;
const MAX_ABOUT_LENGTH = 2000;
const MAX_SKILLS = 30;
const MAX_SKILL_LENGTH = 40;
const PRIMARY_ROLES = ["CUSTOMER", "EXECUTOR"] as const;
type PrimaryRoleValue = (typeof PRIMARY_ROLES)[number];

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
  const parsedPrimaryRole = parsePrimaryRole(payload.primary_role);

  const hasUpdates =
    parsedDisplayName.provided ||
    parsedAbout.provided ||
    parsedSkills.provided ||
    parsedPrimaryRole.provided;

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
    parsedPrimaryRole.provided
  ) {
    await prisma.profile.upsert({
      where: { userId },
      update: {
        ...(parsedAbout.provided ? { about: parsedAbout.normalized } : {}),
        ...(parsedSkills.provided ? { skills: parsedSkills.normalized } : {}),
        ...(parsedPrimaryRole.provided
          ? { primaryRole: parsedPrimaryRole.normalized }
          : {}),
      },
      create: {
        userId,
        about: parsedAbout.provided ? parsedAbout.normalized : null,
        skills: parsedSkills.provided ? (parsedSkills.normalized ?? []) : [],
        primaryRole: parsedPrimaryRole.provided
          ? parsedPrimaryRole.normalized
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
