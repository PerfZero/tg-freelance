import {
  AdminAuditAction,
  AdminAuditTargetType,
  TaskStatus,
  type Prisma,
} from "@prisma/client";
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
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const adminTaskSelect = {
  id: true,
  customerId: true,
  title: true,
  description: true,
  budget: true,
  deadlineAt: true,
  category: true,
  tags: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: {
      id: true,
      username: true,
      displayName: true,
    },
  },
  assignment: {
    select: {
      id: true,
      customerId: true,
      executorId: true,
    },
  },
} satisfies Prisma.TaskSelect;

const adminAuditSelect = {
  id: true,
  action: true,
  targetType: true,
  targetId: true,
  reason: true,
  meta: true,
  createdAt: true,
  adminUser: {
    select: {
      id: true,
      username: true,
      displayName: true,
    },
  },
} satisfies Prisma.AdminAuditLogSelect;

type AdminTaskView = Prisma.TaskGetPayload<{ select: typeof adminTaskSelect }>;
type AdminAuditView = Prisma.AdminAuditLogGetPayload<{
  select: typeof adminAuditSelect;
}>;

type UserBlockPayload = {
  is_blocked?: unknown;
  reason?: unknown;
};

type TaskModeratePayload = {
  action?: unknown;
  reason?: unknown;
};

const normalizeString = (value: string): string => value.trim();

const getQueryString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }

  if (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === "string"
  ) {
    return value[0];
  }

  return undefined;
};

const parseUuid = (value: unknown, fieldName: string): string => {
  assertValidation(typeof value === "string", `${fieldName} must be a valid UUID`);

  const normalized = value as string;
  assertValidation(
    UUID_PATTERN.test(normalized),
    `${fieldName} must be a valid UUID`,
  );

  return normalized;
};

const parsePage = (value: unknown): number => {
  if (value === undefined) {
    return 1;
  }

  const parsed = Number.parseInt(getQueryString(value) ?? "", 10);
  assertValidation(
    Number.isInteger(parsed) && parsed > 0,
    "page must be a positive integer",
  );

  return parsed;
};

const parseLimit = (value: unknown): number => {
  if (value === undefined) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number.parseInt(getQueryString(value) ?? "", 10);
  assertValidation(
    Number.isInteger(parsed) && parsed > 0,
    "limit must be a positive integer",
  );
  assertValidation(parsed <= MAX_LIMIT, `limit must be at most ${MAX_LIMIT}`);

  return parsed;
};

const parseOptionalBooleanQuery = (value: unknown): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = (getQueryString(value) ?? "").toLowerCase();

  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  throw new HttpError(
    400,
    "VALIDATION_ERROR",
    "Boolean query value must be true/false or 1/0",
  );
};

const parseOptionalTaskStatusQuery = (value: unknown): TaskStatus | undefined => {
  const raw = getQueryString(value);
  if (!raw) {
    return undefined;
  }

  const status = raw as TaskStatus;
  assertValidation(
    Object.values(TaskStatus).includes(status),
    "status must be a valid task status",
  );

  return status;
};

const parseOptionalActionQuery = (
  value: unknown,
): AdminAuditAction | undefined => {
  const raw = getQueryString(value);
  if (!raw) {
    return undefined;
  }

  const action = raw as AdminAuditAction;
  assertValidation(
    Object.values(AdminAuditAction).includes(action),
    "action must be a valid admin audit action",
  );

  return action;
};

const parseOptionalTargetTypeQuery = (
  value: unknown,
): AdminAuditTargetType | undefined => {
  const raw = getQueryString(value);
  if (!raw) {
    return undefined;
  }

  const targetType = raw as AdminAuditTargetType;
  assertValidation(
    Object.values(AdminAuditTargetType).includes(targetType),
    "target_type must be a valid admin audit target type",
  );

  return targetType;
};

const parseUserBlockPayload = (body: UserBlockPayload) => {
  assertValidation(typeof body.is_blocked === "boolean", "is_blocked must be a boolean");
  const isBlocked = body.is_blocked as boolean;

  if (body.reason === undefined) {
    return {
      isBlocked,
      reason: null as string | null,
    };
  }

  assertValidation(body.reason !== null, "reason must be a string");
  assertValidation(typeof body.reason === "string", "reason must be a string");
  const normalizedReason = normalizeString(body.reason as string);
  assertValidation(
    normalizedReason.length <= MAX_BLOCK_REASON_LENGTH,
    `reason must be at most ${MAX_BLOCK_REASON_LENGTH} characters`,
  );

  return {
    isBlocked,
    reason: normalizedReason.length > 0 ? normalizedReason : null,
  };
};

const parseTaskModerationPayload = (body: TaskModeratePayload) => {
  assertValidation(typeof body.action === "string", "action must be a string");
  const action = (body.action as string).trim().toUpperCase();

  assertValidation(action === "CANCEL", "action must be CANCEL");

  assertValidation(typeof body.reason === "string", "reason must be a string");
  const reason = normalizeString(body.reason as string);
  assertValidation(reason.length > 0, "reason is required");
  assertValidation(
    reason.length <= MAX_BLOCK_REASON_LENGTH,
    `reason must be at most ${MAX_BLOCK_REASON_LENGTH} characters`,
  );

  return {
    action: "CANCEL" as const,
    reason,
  };
};

const mapAdminTask = (task: AdminTaskView) => ({
  id: task.id,
  customerId: task.customerId,
  title: task.title,
  description: task.description,
  budget: Number(task.budget.toString()),
  deadlineAt: task.deadlineAt ? task.deadlineAt.toISOString() : null,
  category: task.category,
  tags: task.tags,
  status: task.status,
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt.toISOString(),
  customer: task.customer
    ? {
        id: task.customer.id,
        username: task.customer.username,
        displayName: task.customer.displayName,
      }
    : null,
  assignment: task.assignment
    ? {
        id: task.assignment.id,
        customerId: task.assignment.customerId,
        executorId: task.assignment.executorId,
      }
    : null,
});

const mapAdminAuditEntry = (entry: AdminAuditView) => ({
  id: entry.id,
  action: entry.action,
  targetType: entry.targetType,
  targetId: entry.targetId,
  reason: entry.reason,
  meta: entry.meta,
  createdAt: entry.createdAt.toISOString(),
  adminUser: {
    id: entry.adminUser.id,
    username: entry.adminUser.username,
    displayName: entry.adminUser.displayName,
  },
});

const createAdminAuditLog = async (
  db: Prisma.TransactionClient | typeof prisma,
  payload: {
    adminUserId: string;
    action: AdminAuditAction;
    targetType: AdminAuditTargetType;
    targetId: string;
    reason?: string | null;
    meta?: Prisma.InputJsonValue;
  },
): Promise<void> => {
  await db.adminAuditLog.create({
    data: {
      adminUserId: payload.adminUserId,
      action: payload.action,
      targetType: payload.targetType,
      targetId: payload.targetId,
      reason: payload.reason ?? null,
      meta: payload.meta ?? undefined,
    },
  });
};

export const adminRouter = Router();

adminRouter.get("/me", requireAdmin, (req, res) => {
  const authUser = getAuthUser(res);

  res.status(200).json({
    admin: {
      id: authUser.id,
      telegramId: authUser.telegramId.toString(),
      username: authUser.username,
      displayName: authUser.displayName,
    },
  });
});

adminRouter.get("/users", requireAdmin, async (req, res, next) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const query = normalizeString(getQueryString(req.query.q) ?? "");
    const isBlocked = parseOptionalBooleanQuery(req.query.is_blocked);

    const where: Prisma.UserWhereInput = {
      ...(typeof isBlocked === "boolean" ? { isBlocked } : {}),
    };

    if (query.length > 0) {
      const orFilters: Prisma.UserWhereInput[] = [
        {
          displayName: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          username: {
            contains: query,
            mode: "insensitive",
          },
        },
      ];

      if (/^[0-9]+$/.test(query)) {
        orFilters.push({
          telegramId: BigInt(query),
        });
      }

      where.OR = orFilters;
    }

    const skip = (page - 1) * limit;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: { profile: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    res.status(200).json({
      items: users.map(mapPublicUser),
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

adminRouter.get("/tasks", requireAdmin, async (req, res, next) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const status = parseOptionalTaskStatusQuery(req.query.status);
    const query = normalizeString(getQueryString(req.query.q) ?? "");
    const customerIdRaw = getQueryString(req.query.customer_id);
    const isAssigned = parseOptionalBooleanQuery(req.query.is_assigned);

    const where: Prisma.TaskWhereInput = {
      ...(status ? { status } : {}),
      ...(customerIdRaw
        ? {
            customerId: parseUuid(customerIdRaw, "customer_id"),
          }
        : {}),
      ...(typeof isAssigned === "boolean"
        ? {
            assignment: isAssigned ? { isNot: null } : null,
          }
        : {}),
    };

    if (query.length > 0) {
      where.OR = [
        {
          title: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: query,
            mode: "insensitive",
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: adminTaskSelect,
      }),
    ]);

    res.status(200).json({
      items: tasks.map(mapAdminTask),
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

adminRouter.get("/audit-log", requireAdmin, async (req, res, next) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const action = parseOptionalActionQuery(req.query.action);
    const targetType = parseOptionalTargetTypeQuery(req.query.target_type);
    const adminUserIdRaw = getQueryString(req.query.admin_user_id);

    const where: Prisma.AdminAuditLogWhereInput = {
      ...(action ? { action } : {}),
      ...(targetType ? { targetType } : {}),
      ...(adminUserIdRaw
        ? {
            adminUserId: parseUuid(adminUserIdRaw, "admin_user_id"),
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [total, entries] = await Promise.all([
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: adminAuditSelect,
      }),
    ]);

    res.status(200).json({
      items: entries.map(mapAdminAuditEntry),
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

adminRouter.patch("/users/:userId/block", requireAdmin, async (req, res, next) => {
  try {
    const authUser = getAuthUser(res);
    const userId = parseUuid(req.params.userId, "userId");

    assertBodyIsObject(req.body);
    const payload = parseUserBlockPayload(req.body as UserBlockPayload);

    assertValidation(
      authUser.id !== userId,
      "Admin cannot block or unblock themselves",
    );

    const updatedUser = await prisma.$transaction(async (tx) => {
      const targetUser = await tx.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });

      if (!targetUser) {
        throw new HttpError(404, "NOT_FOUND", "User not found");
      }

      const nextUser = await tx.user.update({
        where: { id: userId },
        data: { isBlocked: payload.isBlocked },
        include: { profile: true },
      });

      await createAdminAuditLog(tx, {
        adminUserId: authUser.id,
        action: AdminAuditAction.USER_BLOCK_CHANGED,
        targetType: AdminAuditTargetType.USER,
        targetId: userId,
        reason: payload.reason,
        meta: {
          previousIsBlocked: targetUser.isBlocked,
          nextIsBlocked: payload.isBlocked,
        },
      });

      return nextUser;
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
    next(error);
  }
});

adminRouter.patch("/tasks/:taskId/moderate", requireAdmin, async (req, res, next) => {
  try {
    const authUser = getAuthUser(res);
    const taskId = parseUuid(req.params.taskId, "taskId");

    assertBodyIsObject(req.body);
    const payload = parseTaskModerationPayload(req.body as TaskModeratePayload);

    const task = await prisma.$transaction(async (tx) => {
      const existingTask = await tx.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          status: true,
          title: true,
        },
      });

      if (!existingTask) {
        throw new HttpError(404, "NOT_FOUND", "Task not found");
      }

      if (payload.action === "CANCEL") {
        assertValidation(
          existingTask.status !== TaskStatus.CANCELED,
          "Task is already canceled",
        );
        assertValidation(
          existingTask.status !== TaskStatus.COMPLETED,
          "Completed task cannot be moderated to canceled",
        );

        const moderatedTask = await tx.task.update({
          where: { id: taskId },
          data: {
            status: TaskStatus.CANCELED,
          },
          select: adminTaskSelect,
        });

        await tx.taskStatusHistory.create({
          data: {
            taskId,
            fromStatus: existingTask.status,
            toStatus: TaskStatus.CANCELED,
            changedBy: authUser.id,
            comment: `ADMIN: ${payload.reason}`,
          },
        });

        await createAdminAuditLog(tx, {
          adminUserId: authUser.id,
          action: AdminAuditAction.TASK_MODERATED,
          targetType: AdminAuditTargetType.TASK,
          targetId: taskId,
          reason: payload.reason,
          meta: {
            moderationAction: payload.action,
            fromStatus: existingTask.status,
            toStatus: TaskStatus.CANCELED,
            taskTitle: existingTask.title,
          },
        });

        return moderatedTask;
      }

      throw new HttpError(400, "VALIDATION_ERROR", "Unsupported moderation action");
    });

    logger.info("admin.task_moderated", {
      adminUserId: authUser.id,
      taskId,
      action: payload.action,
      reason: payload.reason,
    });

    res.status(200).json({
      task: mapAdminTask(task),
    });
  } catch (error) {
    next(error);
  }
});
