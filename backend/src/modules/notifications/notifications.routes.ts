import { type Prisma } from "@prisma/client";
import { Router } from "express";

import { HttpError } from "../../common/http-error";
import { assertValidation } from "../../common/validation";
import { prisma } from "../../config/prisma";
import { getAuthUser, requireAuth } from "../auth/auth.middleware";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const notificationSelect = {
  id: true,
  userId: true,
  type: true,
  title: true,
  body: true,
  payload: true,
  isRead: true,
  createdAt: true,
  readAt: true,
} satisfies Prisma.NotificationSelect;

type NotificationView = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;

const mapNotification = (notification: NotificationView) => ({
  id: notification.id,
  userId: notification.userId,
  type: notification.type,
  title: notification.title,
  body: notification.body,
  payload: notification.payload,
  isRead: notification.isRead,
  createdAt: notification.createdAt.toISOString(),
  readAt: notification.readAt ? notification.readAt.toISOString() : null,
});

const parseUuid = (value: unknown, fieldName: string): string => {
  assertValidation(typeof value === "string", `${fieldName} must be a valid UUID`);
  const normalized = value as string;
  assertValidation(
    UUID_PATTERN.test(normalized),
    `${fieldName} must be a valid UUID`,
  );

  return normalized;
};

const parsePositiveInt = (
  value: unknown,
  fieldName: string,
  fallback: number,
): number => {
  if (value === undefined) {
    return fallback;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw), 10);
  assertValidation(
    Number.isInteger(parsed) && parsed > 0,
    `${fieldName} must be a positive integer`,
  );

  return parsed;
};

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const authUser = getAuthUser(res);

    const page = parsePositiveInt(req.query.page, "page", 1);
    const limit = parsePositiveInt(req.query.limit, "limit", DEFAULT_LIMIT);
    assertValidation(limit <= MAX_LIMIT, `limit must be at most ${MAX_LIMIT}`);
    const skip = (page - 1) * limit;

    const [total, unreadCount, items] = await Promise.all([
      prisma.notification.count({
        where: { userId: authUser.id },
      }),
      prisma.notification.count({
        where: { userId: authUser.id, isRead: false },
      }),
      prisma.notification.findMany({
        where: { userId: authUser.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: notificationSelect,
      }),
    ]);

    res.status(200).json({
      items: items.map(mapNotification),
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/:id/read", requireAuth, async (req, res, next) => {
  try {
    const authUser = getAuthUser(res);
    const notificationId = parseUuid(req.params.id, "id");

    const existing = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: authUser.id,
      },
      select: {
        id: true,
        isRead: true,
      },
    });

    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Notification not found");
    }

    if (!existing.isRead) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: notificationSelect,
    });

    if (!notification) {
      throw new HttpError(404, "NOT_FOUND", "Notification not found");
    }

    res.status(200).json({
      notification: mapNotification(notification),
    });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/read-all", requireAuth, async (_req, res, next) => {
  try {
    const authUser = getAuthUser(res);

    const result = await prisma.notification.updateMany({
      where: {
        userId: authUser.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.status(200).json({
      updatedCount: result.count,
    });
  } catch (error) {
    next(error);
  }
});
