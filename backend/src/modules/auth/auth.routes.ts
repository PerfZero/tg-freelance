import { Router } from "express";

import { HttpError } from "../../common/http-error";
import { assertBodyIsObject, assertValidation } from "../../common/validation";
import { prisma } from "../../config/prisma";
import { getAuthUser, requireAuth } from "./auth.middleware";
import { mapPublicUser } from "./auth.mapper";
import { signAuthToken } from "./auth.token";
import { verifyTelegramInitData } from "./telegram-init-data";
import type { UserWithProfile } from "./auth.types";

const defaultRoleFlags = {
  customer: true,
  executor: true,
};

const toDisplayName = (
  firstName: string,
  lastName?: string,
  username?: string,
  telegramId?: number,
): string => {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullName) {
    return fullName;
  }

  if (username) {
    return `@${username}`;
  }

  return telegramId ? `Telegram User ${telegramId}` : "Telegram User";
};

const getInitDataFromBody = (body: unknown): string => {
  assertBodyIsObject(body);

  const payload = body as { initData?: unknown };
  assertValidation(
    typeof payload.initData === "string" && payload.initData.trim().length > 0,
    "initData is required",
  );

  return payload.initData as string;
};

const ensureProfile = async (userId: string): Promise<void> => {
  await prisma.profile.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      skills: [],
    },
  });
};

const getUserWithProfile = async (userId: string): Promise<UserWithProfile> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    throw new HttpError(
      500,
      "INTERNAL_ERROR",
      "User was not found after auth upsert",
    );
  }

  return user;
};

export const authRouter = Router();

authRouter.post("/telegram", async (req, res, next) => {
  try {
    const initData = getInitDataFromBody(req.body);
    const verifiedInitData = verifyTelegramInitData(initData);

    const telegramUser = verifiedInitData.user;

    const user = await prisma.user.upsert({
      where: {
        telegramId: BigInt(telegramUser.id),
      },
      update: {
        username: telegramUser.username ?? null,
        displayName: toDisplayName(
          telegramUser.first_name,
          telegramUser.last_name,
          telegramUser.username,
          telegramUser.id,
        ),
      },
      create: {
        telegramId: BigInt(telegramUser.id),
        username: telegramUser.username ?? null,
        displayName: toDisplayName(
          telegramUser.first_name,
          telegramUser.last_name,
          telegramUser.username,
          telegramUser.id,
        ),
        roleFlags: defaultRoleFlags,
      },
    });

    await ensureProfile(user.id);

    const hydratedUser = await getUserWithProfile(user.id);
    const token = signAuthToken({
      sub: hydratedUser.id,
      telegramId: hydratedUser.telegramId.toString(),
    });

    res.status(200).json({
      token,
      tokenType: "Bearer",
      user: mapPublicUser(hydratedUser),
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (_req, res, next) => {
  try {
    const user = getAuthUser(res);

    res.status(200).json({
      user: mapPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
});
