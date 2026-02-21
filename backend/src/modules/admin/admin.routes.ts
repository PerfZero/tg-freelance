import { Router } from "express";

import { HttpError } from "../../common/http-error";
import { logger } from "../../common/logger";
import { assertBodyIsObject, assertValidation } from "../../common/validation";
import { prisma } from "../../config/prisma";
import { getAuthUser, requireAdmin } from "../auth/auth.middleware";
import { mapPublicUser } from "../auth/auth.mapper";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BLOCK_REASON_LENGTH = 500;

type UserBlockPayload = {
  is_blocked?: unknown;
  reason?: unknown;
};

const parseUserId = (value: unknown): string => {
  assertValidation(typeof value === "string", "userId must be a valid UUID");
  const normalized = value as string;
  assertValidation(
    UUID_PATTERN.test(normalized),
    "userId must be a valid UUID",
  );

  return normalized;
};

const parseUserBlockPayload = (body: UserBlockPayload) => {
  assertValidation(
    typeof body.is_blocked === "boolean",
    "is_blocked must be a boolean",
  );
  const isBlocked = body.is_blocked as boolean;

  if (body.reason === undefined) {
    return {
      isBlocked,
      reason: null as string | null,
    };
  }

  assertValidation(body.reason !== null, "reason must be a string");
  assertValidation(typeof body.reason === "string", "reason must be a string");
  const normalizedReason = (body.reason as string).trim();
  assertValidation(
    normalizedReason.length <= MAX_BLOCK_REASON_LENGTH,
    `reason must be at most ${MAX_BLOCK_REASON_LENGTH} characters`,
  );

  return {
    isBlocked,
    reason: normalizedReason.length > 0 ? normalizedReason : null,
  };
};

export const adminRouter = Router();

adminRouter.patch(
  "/users/:userId/block",
  requireAdmin,
  async (req, res, next) => {
    try {
      const authUser = getAuthUser(res);
      const userId = parseUserId(req.params.userId);

      assertBodyIsObject(req.body);
      const payload = parseUserBlockPayload(req.body as UserBlockPayload);

      assertValidation(
        authUser.id !== userId,
        "Admin cannot block or unblock themselves",
      );

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { isBlocked: payload.isBlocked },
        include: { profile: true },
      });

      logger.info("admin.user_block_changed", {
        adminUserId: authUser.id,
        targetUserId: userId,
        isBlocked: payload.isBlocked,
        reason: payload.reason,
      });

      res.status(200).json({
        user: mapPublicUser(updatedUser),
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === "P2025"
      ) {
        next(new HttpError(404, "NOT_FOUND", "User not found"));
        return;
      }

      next(error);
    }
  },
);
