import { NotificationType, type PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";

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
