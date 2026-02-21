import { AppLogLevel, type Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";

type PersistLevel = "info" | "warn" | "error";

type PersistContext = Record<string, unknown>;

const toAppLogLevel = (level: PersistLevel): AppLogLevel => {
  if (level === "info") {
    return AppLogLevel.INFO;
  }

  if (level === "warn") {
    return AppLogLevel.WARN;
  }

  return AppLogLevel.ERROR;
};

const toJsonContext = (
  context: PersistContext,
): Prisma.InputJsonValue | undefined => {
  try {
    return JSON.parse(JSON.stringify(context)) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
};

const shouldPersistLog = (
  level: PersistLevel,
  message: string,
  context: PersistContext,
): boolean => {
  if (level !== "info") {
    return true;
  }

  if (
    message === "server.started" ||
    message.startsWith("admin.") ||
    message.startsWith("audit.")
  ) {
    return true;
  }

  if (
    message === "request.finish" &&
    typeof context.status === "number" &&
    context.status >= 400
  ) {
    return true;
  }

  return false;
};

export const persistApplicationLog = (
  level: PersistLevel,
  message: string,
  context: PersistContext,
): void => {
  if (!shouldPersistLog(level, message, context)) {
    return;
  }

  const jsonContext = toJsonContext(context);

  void prisma.appLog
    .create({
      data: {
        level: toAppLogLevel(level),
        message,
        context: jsonContext,
      },
    })
    .catch(() => {
      // no-op, logging persistence must never break request flow
    });
};
