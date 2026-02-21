import { NotificationType, type PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { logger } from "../../common/logger";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";

type NotificationDbClient = PrismaClient | Prisma.TransactionClient;

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Prisma.InputJsonValue | null;
};

export const createNotification = async (
  db: NotificationDbClient,
  input: CreateNotificationInput,
): Promise<void> => {
  await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      payload: input.payload ?? undefined,
    },
  });
};

type SendTaskBotNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  taskId: string;
};

const buildTaskDeepLink = (taskId: string): string | null => {
  const botUsername = env.telegramBotUsername.trim().replace(/^@/, "");
  if (!botUsername) {
    return null;
  }

  return `https://t.me/${botUsername}?startapp=${encodeURIComponent(`task_${taskId}`)}`;
};

const buildBotMessage = (
  title: string,
  body: string,
  taskId: string,
): string => {
  const deepLink = buildTaskDeepLink(taskId);

  if (deepLink) {
    return `${title}\n\n${body}\n\nОткрыть задачу: ${deepLink}`;
  }

  return `${title}\n\n${body}`;
};

const shouldSkipBotNotification = (
  user: {
    isBlocked: boolean;
    profile: {
      botNotificationsEnabled: boolean;
    } | null;
  } | null,
): boolean => {
  if (!user) {
    return true;
  }

  if (user.isBlocked) {
    return true;
  }

  if (user.profile && !user.profile.botNotificationsEnabled) {
    return true;
  }

  return false;
};

export const sendTaskBotNotification = async (
  input: SendTaskBotNotificationInput,
): Promise<void> => {
  if (!env.telegramBotToken) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      telegramId: true,
      isBlocked: true,
      profile: {
        select: {
          botNotificationsEnabled: true,
        },
      },
    },
  });

  if (shouldSkipBotNotification(user)) {
    return;
  }

  const targetUser = user as {
    id: string;
    telegramId: bigint;
    isBlocked: boolean;
    profile: {
      botNotificationsEnabled: boolean;
    } | null;
  };

  const messageText = buildBotMessage(input.title, input.body, input.taskId);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          chat_id: targetUser.telegramId.toString(),
          text: messageText,
          disable_web_page_preview: true,
        }),
      },
    );

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`Telegram API ${response.status}: ${responseText}`);
    }
  } catch (error) {
    logger.warn("notifications.telegram_send_failed", {
      event: input.type,
      targetUserId: input.userId,
      taskId: input.taskId,
      error:
        error instanceof Error ? error.message : "Unknown Telegram send error",
    });
  }
};
