import { NotificationType, TaskStatus, type Prisma } from "@prisma/client";
import { Router } from "express";

import { HttpError } from "../../common/http-error";
import { logger } from "../../common/logger";
import { createInMemoryRateLimit } from "../../common/rate-limit";
import { assertBodyIsObject, assertValidation } from "../../common/validation";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { getAuthUser, requireAuth } from "../auth/auth.middleware";
import {
  createNotification,
  sendTaskBotNotification,
} from "../notifications/notifications.service";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_CATEGORY_LENGTH = 80;
const MAX_TAGS = 30;
const MAX_TAG_LENGTH = 40;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_PROPOSAL_COMMENT_LENGTH = 3000;
const MAX_STATUS_COMMENT_LENGTH = 2000;
const MAX_TASK_MESSAGE_LENGTH = 4000;
const DEFAULT_CHAT_LIMIT = 100;
const MAX_CHAT_LIMIT = 200;

type TaskCreatePayload = {
  title?: unknown;
  description?: unknown;
  budget?: unknown;
  deadline_at?: unknown;
  category?: unknown;
  tags?: unknown;
};

type TaskPatchPayload = {
  title?: unknown;
  description?: unknown;
  budget?: unknown;
  deadline_at?: unknown;
  category?: unknown;
  tags?: unknown;
};

type ProposalCreatePayload = {
  price?: unknown;
  comment?: unknown;
  eta_days?: unknown;
};

type TaskSelectProposalPayload = {
  proposal_id?: unknown;
};

type TaskRejectReviewPayload = {
  comment?: unknown;
};

type TaskMessageCreatePayload = {
  text?: unknown;
};

const taskSelect = {
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

const proposalSelect = {
  id: true,
  taskId: true,
  executorId: true,
  price: true,
  comment: true,
  etaDays: true,
  createdAt: true,
  updatedAt: true,
  executor: {
    select: {
      id: true,
      username: true,
      displayName: true,
      profile: {
        select: {
          about: true,
          skills: true,
          portfolioLinks: true,
          basePrice: true,
          experienceLevel: true,
          telegramAvatarUrl: true,
          customAvatarDataUrl: true,
          rating: true,
          completedTasksCount: true,
        },
      },
    },
  },
} satisfies Prisma.ProposalSelect;

const statusHistorySelect = {
  id: true,
  taskId: true,
  fromStatus: true,
  toStatus: true,
  changedBy: true,
  comment: true,
  createdAt: true,
  changedByUser: {
    select: {
      id: true,
      username: true,
      displayName: true,
    },
  },
} satisfies Prisma.TaskStatusHistorySelect;

const taskMessageSelect = {
  id: true,
  taskId: true,
  senderId: true,
  text: true,
  createdAt: true,
  sender: {
    select: {
      id: true,
      username: true,
      displayName: true,
    },
  },
} satisfies Prisma.TaskMessageSelect;

type TaskView = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;
type ProposalView = Prisma.ProposalGetPayload<{
  select: typeof proposalSelect;
}>;
type TaskStatusHistoryView = Prisma.TaskStatusHistoryGetPayload<{
  select: typeof statusHistorySelect;
}>;
type TaskMessageView = Prisma.TaskMessageGetPayload<{
  select: typeof taskMessageSelect;
}>;

const normalizeString = (value: string): string => value.trim();

const isUuid = (value: string): boolean => UUID_PATTERN.test(value);

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

const parsePositiveNumber = (value: unknown, fieldName: string): string => {
  assertValidation(
    typeof value === "string" || typeof value === "number",
    `${fieldName} must be a number`,
  );

  const parsed = Number(value);

  assertValidation(Number.isFinite(parsed), `${fieldName} must be a number`);
  assertValidation(parsed > 0, `${fieldName} must be greater than 0`);

  return String(parsed);
};

const parsePositiveInteger = (value: unknown, fieldName: string): number => {
  assertValidation(
    typeof value === "string" || typeof value === "number",
    `${fieldName} must be an integer`,
  );

  const parsed = Number(value);

  assertValidation(Number.isInteger(parsed), `${fieldName} must be an integer`);
  assertValidation(parsed > 0, `${fieldName} must be greater than 0`);

  return parsed;
};

const parseRequiredString = (
  value: unknown,
  fieldName: string,
  maxLength: number,
): string => {
  assertValidation(typeof value === "string", `${fieldName} must be a string`);

  const normalized = normalizeString(value as string);

  assertValidation(normalized.length > 0, `${fieldName} is required`);
  assertValidation(
    normalized.length <= maxLength,
    `${fieldName} must be at most ${maxLength} characters`,
  );

  return normalized;
};

const parseOptionalString = (
  value: unknown,
  fieldName: string,
  maxLength: number,
): { provided: boolean; normalized?: string } => {
  if (value === undefined) {
    return { provided: false };
  }

  return {
    provided: true,
    normalized: parseRequiredString(value, fieldName, maxLength),
  };
};

const parseOptionalBudget = (
  value: unknown,
): { provided: boolean; normalized?: string } => {
  if (value === undefined) {
    return { provided: false };
  }

  return {
    provided: true,
    normalized: parsePositiveNumber(value, "budget"),
  };
};

const parseOptionalDeadline = (
  value: unknown,
): { provided: boolean; normalized?: Date | null } => {
  if (value === undefined) {
    return { provided: false };
  }

  if (value === null) {
    return { provided: true, normalized: null };
  }

  assertValidation(
    typeof value === "string",
    "deadline_at must be an ISO date string or null",
  );

  const parsedDate = new Date(value as string);

  assertValidation(
    !Number.isNaN(parsedDate.getTime()),
    "deadline_at must be a valid ISO date string",
  );

  return {
    provided: true,
    normalized: parsedDate,
  };
};

const parseOptionalTags = (
  value: unknown,
): { provided: boolean; normalized?: string[] } => {
  if (value === undefined) {
    return { provided: false };
  }

  assertValidation(Array.isArray(value), "tags must be an array of strings");

  const tags = (value as unknown[]).map((item, index) => {
    assertValidation(
      typeof item === "string",
      `tags[${index}] must be a string`,
    );

    const normalized = normalizeString(item as string);

    assertValidation(normalized.length > 0, `tags[${index}] cannot be empty`);
    assertValidation(
      normalized.length <= MAX_TAG_LENGTH,
      `tags[${index}] must be at most ${MAX_TAG_LENGTH} characters`,
    );

    return normalized;
  });

  assertValidation(
    tags.length <= MAX_TAGS,
    `tags must contain at most ${MAX_TAGS} items`,
  );

  return {
    provided: true,
    normalized: tags,
  };
};

const parseRequiredTaskCreate = (body: TaskCreatePayload) => {
  const title = parseRequiredString(body.title, "title", MAX_TITLE_LENGTH);
  const description = parseRequiredString(
    body.description,
    "description",
    MAX_DESCRIPTION_LENGTH,
  );
  const budget = parsePositiveNumber(body.budget, "budget");
  const category = parseRequiredString(
    body.category,
    "category",
    MAX_CATEGORY_LENGTH,
  );
  const deadline = parseOptionalDeadline(body.deadline_at);
  const tags = parseOptionalTags(body.tags);

  return {
    title,
    description,
    budget,
    category,
    deadline: deadline.provided ? deadline.normalized : undefined,
    tags: tags.provided ? (tags.normalized ?? []) : [],
  };
};

const parseRequiredProposalCreate = (body: ProposalCreatePayload) => {
  const price = parsePositiveNumber(body.price, "price");
  const comment = parseRequiredString(
    body.comment,
    "comment",
    MAX_PROPOSAL_COMMENT_LENGTH,
  );
  const etaDays = parsePositiveInteger(body.eta_days, "eta_days");

  return {
    price,
    comment,
    etaDays,
  };
};

const parseUuidValue = (value: unknown, fieldName: string): string => {
  assertValidation(
    typeof value === "string",
    `${fieldName} must be a valid UUID`,
  );

  const normalized = value as string;
  assertValidation(isUuid(normalized), `${fieldName} must be a valid UUID`);

  return normalized;
};

const parseRequiredTaskSelectProposal = (body: TaskSelectProposalPayload) => ({
  proposalId: parseUuidValue(body.proposal_id, "proposal_id"),
});

const parseRequiredTaskRejectReview = (body: TaskRejectReviewPayload) => ({
  comment: parseRequiredString(
    body.comment,
    "comment",
    MAX_STATUS_COMMENT_LENGTH,
  ),
});

const parseRequiredTaskMessageCreate = (body: TaskMessageCreatePayload) => ({
  text: parseRequiredString(body.text, "text", MAX_TASK_MESSAGE_LENGTH),
});

const mapTask = (task: TaskView) => ({
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

const mapProposal = (proposal: ProposalView) => ({
  id: proposal.id,
  taskId: proposal.taskId,
  executorId: proposal.executorId,
  price: Number(proposal.price.toString()),
  comment: proposal.comment,
  etaDays: proposal.etaDays,
  createdAt: proposal.createdAt.toISOString(),
  updatedAt: proposal.updatedAt.toISOString(),
  executor: proposal.executor
    ? {
        id: proposal.executor.id,
        username: proposal.executor.username,
        displayName: proposal.executor.displayName,
        profile: proposal.executor.profile
          ? {
              about: proposal.executor.profile.about,
              skills: proposal.executor.profile.skills,
              portfolioLinks: proposal.executor.profile.portfolioLinks,
              basePrice: proposal.executor.profile.basePrice
                ? Number(proposal.executor.profile.basePrice.toString())
                : null,
              experienceLevel: proposal.executor.profile.experienceLevel,
              avatarUrl:
                proposal.executor.profile.customAvatarDataUrl ??
                proposal.executor.profile.telegramAvatarUrl ??
                null,
              rating: Number(proposal.executor.profile.rating.toString()),
              completedTasksCount:
                proposal.executor.profile.completedTasksCount,
            }
          : null,
      }
    : null,
});

const mapTaskStatusHistory = (entry: TaskStatusHistoryView) => ({
  id: entry.id,
  taskId: entry.taskId,
  fromStatus: entry.fromStatus,
  toStatus: entry.toStatus,
  changedBy: entry.changedBy,
  comment: entry.comment,
  createdAt: entry.createdAt.toISOString(),
  changedByUser: {
    id: entry.changedByUser.id,
    username: entry.changedByUser.username,
    displayName: entry.changedByUser.displayName,
  },
});

const mapTaskMessage = (message: TaskMessageView) => ({
  id: message.id,
  taskId: message.taskId,
  senderId: message.senderId,
  text: message.text,
  createdAt: message.createdAt.toISOString(),
  sender: {
    id: message.sender.id,
    username: message.sender.username,
    displayName: message.sender.displayName,
  },
});

const getTaskOrThrow = async (taskId: string): Promise<TaskView> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: taskSelect,
  });

  if (!task) {
    throw new HttpError(404, "NOT_FOUND", "Task not found");
  }

  return task;
};

const parseTaskIdOrThrow = (id: unknown): string => {
  return parseUuidValue(id, "id");
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

const parseChatLimit = (value: unknown): number => {
  if (value === undefined) {
    return DEFAULT_CHAT_LIMIT;
  }

  const parsed = Number.parseInt(getQueryString(value) ?? "", 10);
  assertValidation(
    Number.isInteger(parsed) && parsed > 0,
    "limit must be a positive integer",
  );
  assertValidation(
    parsed <= MAX_CHAT_LIMIT,
    `limit must be at most ${MAX_CHAT_LIMIT}`,
  );

  return parsed;
};

const parseSort = (value: unknown): Prisma.TaskOrderByWithRelationInput => {
  const sortRaw = getQueryString(value);
  if (!sortRaw || sortRaw === "new") {
    return { createdAt: "desc" };
  }

  if (sortRaw === "budget" || sortRaw === "budget_desc") {
    return { budget: "desc" };
  }

  if (sortRaw === "budget_asc") {
    return { budget: "asc" };
  }

  throw new HttpError(
    400,
    "VALIDATION_ERROR",
    "sort must be one of: new, budget, budget_asc, budget_desc",
  );
};

const parseStatusFilter = (value: unknown): TaskStatus => {
  const raw = getQueryString(value);

  if (!raw) {
    return TaskStatus.OPEN;
  }

  const status = raw as TaskStatus;
  assertValidation(
    Object.values(TaskStatus).includes(status),
    "status must be a valid task status",
  );

  return status;
};

type TaskStatusTransition = {
  taskId: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  changedBy: string;
  comment?: string | null;
};

const createTaskStatusHistory = async (
  tx: Prisma.TransactionClient,
  transition: TaskStatusTransition,
): Promise<void> => {
  if (transition.fromStatus === transition.toStatus) {
    return;
  }

  const createdEntry = await tx.taskStatusHistory.create({
    data: {
      taskId: transition.taskId,
      fromStatus: transition.fromStatus,
      toStatus: transition.toStatus,
      changedBy: transition.changedBy,
      comment: transition.comment ?? null,
    },
    select: {
      id: true,
      createdAt: true,
    },
  });

  logger.info("audit.task_status_changed", {
    historyId: createdEntry.id,
    taskId: transition.taskId,
    fromStatus: transition.fromStatus,
    toStatus: transition.toStatus,
    changedBy: transition.changedBy,
    comment: transition.comment ?? null,
    createdAt: createdEntry.createdAt.toISOString(),
  });
};

const updateTaskStatusWithHistory = async (
  tx: Prisma.TransactionClient,
  transition: TaskStatusTransition,
): Promise<TaskView> => {
  const updatedTask = await tx.task.update({
    where: { id: transition.taskId },
    data: { status: transition.toStatus },
    select: taskSelect,
  });

  await createTaskStatusHistory(tx, transition);

  return updatedTask;
};

type TaskChatContext = {
  id: string;
  customerId: string;
  assignment: {
    executorId: string;
  } | null;
};

const getTaskChatContextOrThrow = async (
  taskId: string,
): Promise<TaskChatContext> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      customerId: true,
      assignment: {
        select: {
          executorId: true,
        },
      },
    },
  });

  if (!task) {
    throw new HttpError(404, "NOT_FOUND", "Task not found");
  }

  return task;
};

const assertTaskChatParticipantOrThrow = (
  task: TaskChatContext,
  authUserId: string,
): void => {
  if (!task.assignment) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Chat is available only after executor selection",
    );
  }

  const isParticipant =
    task.customerId === authUserId || task.assignment.executorId === authUserId;

  if (!isParticipant) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Only task customer and assigned executor can access chat",
    );
  }
};

export const tasksRouter = Router();

const taskCreateRateLimit = createInMemoryRateLimit(
  {
    scope: "tasks.create",
    windowMs: env.rateLimitWindowMs,
    maxRequests: env.taskCreateRateLimitPerWindow,
    message: "Too many task creations. Please wait before creating a new task.",
  },
  (_req, res) => getAuthUser(res).id,
);

const proposalCreateRateLimit = createInMemoryRateLimit(
  {
    scope: "proposals.create",
    windowMs: env.rateLimitWindowMs,
    maxRequests: env.proposalCreateRateLimitPerWindow,
    message:
      "Too many proposal creations. Please wait before creating a new proposal.",
  },
  (_req, res) => getAuthUser(res).id,
);

tasksRouter.post(
  "/",
  requireAuth,
  taskCreateRateLimit,
  async (req, res, next) => {
    try {
      assertBodyIsObject(req.body);

      const authUser = getAuthUser(res);
      const payload = parseRequiredTaskCreate(req.body as TaskCreatePayload);

      const task = await prisma.$transaction(async (tx) => {
        const createdTask = await tx.task.create({
          data: {
            customerId: authUser.id,
            title: payload.title,
            description: payload.description,
            budget: payload.budget,
            deadlineAt: payload.deadline,
            category: payload.category,
            tags: payload.tags,
            status: TaskStatus.OPEN,
          },
          select: taskSelect,
        });

        await createTaskStatusHistory(tx, {
          taskId: createdTask.id,
          fromStatus: null,
          toStatus: TaskStatus.OPEN,
          changedBy: authUser.id,
        });

        return createdTask;
      });

      res.status(201).json({
        task: mapTask(task),
      });
    } catch (error) {
      next(error);
    }
  },
);

tasksRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const orderBy = parseSort(req.query.sort);
    const status = parseStatusFilter(req.query.status);

    const categoryRaw = getQueryString(req.query.category);
    const searchRaw = getQueryString(req.query.q);

    const budgetMinRaw =
      getQueryString(req.query.budget_min) ??
      getQueryString(req.query.budget_from);
    const budgetMaxRaw =
      getQueryString(req.query.budget_max) ??
      getQueryString(req.query.budget_to);

    const budgetMin = budgetMinRaw
      ? Number(parsePositiveNumber(budgetMinRaw, "budget_min"))
      : undefined;
    const budgetMax = budgetMaxRaw
      ? Number(parsePositiveNumber(budgetMaxRaw, "budget_max"))
      : undefined;

    if (budgetMin !== undefined && budgetMax !== undefined) {
      assertValidation(
        budgetMin <= budgetMax,
        "budget_min must be <= budget_max",
      );
    }

    const where: Prisma.TaskWhereInput = {
      status,
      ...(categoryRaw && normalizeString(categoryRaw).length > 0
        ? { category: normalizeString(categoryRaw) }
        : {}),
      ...(budgetMin !== undefined || budgetMax !== undefined
        ? {
            budget: {
              ...(budgetMin !== undefined ? { gte: String(budgetMin) } : {}),
              ...(budgetMax !== undefined ? { lte: String(budgetMax) } : {}),
            },
          }
        : {}),
      ...(searchRaw && normalizeString(searchRaw).length > 0
        ? {
            OR: [
              {
                title: {
                  contains: normalizeString(searchRaw),
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: normalizeString(searchRaw),
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: taskSelect,
      }),
    ]);

    res.status(200).json({
      items: tasks.map(mapTask),
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

tasksRouter.post(
  "/:id/proposals",
  requireAuth,
  proposalCreateRateLimit,
  async (req, res, next) => {
    try {
      const taskId = parseTaskIdOrThrow(req.params.id);
      assertBodyIsObject(req.body);

      const authUser = getAuthUser(res);
      const payload = parseRequiredProposalCreate(
        req.body as ProposalCreatePayload,
      );

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          customerId: true,
          title: true,
          status: true,
          assignment: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!task) {
        throw new HttpError(404, "NOT_FOUND", "Task not found");
      }

      assertValidation(
        task.status === TaskStatus.OPEN,
        "Task is not open for proposals",
      );
      assertValidation(
        task.customerId !== authUser.id,
        "You cannot create a proposal for your own task",
      );
      assertValidation(
        !task.assignment,
        "Executor has already been selected for this task",
      );

      const existingProposal = await prisma.proposal.findUnique({
        where: {
          taskId_executorId: {
            taskId,
            executorId: authUser.id,
          },
        },
        select: { id: true },
      });

      assertValidation(
        !existingProposal,
        "Only one proposal per executor is allowed for a task",
      );

      let proposal: ProposalView;

      try {
        proposal = await prisma.proposal.create({
          data: {
            taskId,
            executorId: authUser.id,
            price: payload.price,
            comment: payload.comment,
            etaDays: payload.etaDays,
          },
          select: proposalSelect,
        });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: unknown }).code === "P2002"
        ) {
          throw new HttpError(
            400,
            "VALIDATION_ERROR",
            "Only one proposal per executor is allowed for a task",
          );
        }

        throw error;
      }

      try {
        await createNotification(prisma, {
          userId: task.customerId,
          type: NotificationType.PROPOSAL_CREATED,
          title: "Новый отклик",
          body: `По задаче "${task.title}" пришел новый отклик.`,
          payload: {
            taskId,
            proposalId: proposal.id,
          },
        });
      } catch (notificationError) {
        logger.warn("notifications.create_failed", {
          event: "PROPOSAL_CREATED",
          taskId,
          proposalId: proposal.id,
          targetUserId: task.customerId,
          error:
            notificationError instanceof Error
              ? notificationError.message
              : "Unknown notification error",
        });
      }

      void sendTaskBotNotification({
        userId: task.customerId,
        type: NotificationType.PROPOSAL_CREATED,
        title: "Новый отклик",
        body: `По задаче "${task.title}" пришел новый отклик.`,
        taskId,
      });

      res.status(201).json({
        proposal: mapProposal(proposal),
      });
    } catch (error) {
      next(error);
    }
  },
);

tasksRouter.get("/:id/proposals", requireAuth, async (req, res, next) => {
  try {
    const taskId = parseTaskIdOrThrow(req.params.id);
    const authUser = getAuthUser(res);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        customerId: true,
      },
    });

    if (!task) {
      throw new HttpError(404, "NOT_FOUND", "Task not found");
    }

    const isTaskOwner = task.customerId === authUser.id;

    if (!isTaskOwner) {
      const ownProposal = await prisma.proposal.findFirst({
        where: {
          taskId,
          executorId: authUser.id,
        },
        select: proposalSelect,
      });

      if (!ownProposal) {
        throw new HttpError(
          403,
          "FORBIDDEN",
          "Only task owner or proposal author can view proposals",
        );
      }

      res.status(200).json({
        items: [mapProposal(ownProposal)],
      });
      return;
    }

    const proposals = await prisma.proposal.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
      select: proposalSelect,
    });

    res.status(200).json({
      items: proposals.map(mapProposal),
    });
  } catch (error) {
    next(error);
  }
});

tasksRouter.get("/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const taskId = parseTaskIdOrThrow(req.params.id);
    const authUser = getAuthUser(res);
    const limit = parseChatLimit(req.query.limit);

    const taskContext = await getTaskChatContextOrThrow(taskId);
    assertTaskChatParticipantOrThrow(taskContext, authUser.id);

    const messages = await prisma.taskMessage.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: taskMessageSelect,
    });

    res.status(200).json({
      items: messages.reverse().map(mapTaskMessage),
    });
  } catch (error) {
    next(error);
  }
});

tasksRouter.post("/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const taskId = parseTaskIdOrThrow(req.params.id);
    assertBodyIsObject(req.body);

    const authUser = getAuthUser(res);
    const payload = parseRequiredTaskMessageCreate(
      req.body as TaskMessageCreatePayload,
    );

    const taskContext = await getTaskChatContextOrThrow(taskId);
    assertTaskChatParticipantOrThrow(taskContext, authUser.id);

    const message = await prisma.taskMessage.create({
      data: {
        taskId,
        senderId: authUser.id,
        text: payload.text,
      },
      select: taskMessageSelect,
    });

    res.status(201).json({
      message: mapTaskMessage(message),
    });
  } catch (error) {
    next(error);
  }
});

tasksRouter.post(
  "/:id/select-proposal",
  requireAuth,
  async (req, res, next) => {
    try {
      const taskId = parseTaskIdOrThrow(req.params.id);
      assertBodyIsObject(req.body);

      const authUser = getAuthUser(res);
      const payload = parseRequiredTaskSelectProposal(
        req.body as TaskSelectProposalPayload,
      );

      let updatedTask: TaskView;

      try {
        updatedTask = await prisma.$transaction(async (tx) => {
          const task = await tx.task.findUnique({
            where: { id: taskId },
            select: {
              id: true,
              customerId: true,
              status: true,
              title: true,
              assignment: {
                select: { id: true },
              },
            },
          });

          if (!task) {
            throw new HttpError(404, "NOT_FOUND", "Task not found");
          }

          if (task.customerId !== authUser.id) {
            throw new HttpError(
              403,
              "FORBIDDEN",
              "Only task owner can select proposal",
            );
          }

          assertValidation(
            task.status === TaskStatus.OPEN,
            "Only OPEN tasks can select executor",
          );
          assertValidation(
            !task.assignment,
            "Executor has already been selected for this task",
          );

          const proposal = await tx.proposal.findUnique({
            where: { id: payload.proposalId },
            select: {
              id: true,
              taskId: true,
              executorId: true,
              assignment: {
                select: { id: true },
              },
            },
          });

          if (!proposal || proposal.taskId !== taskId) {
            throw new HttpError(
              404,
              "NOT_FOUND",
              "Proposal not found for this task",
            );
          }

          assertValidation(
            !proposal.assignment,
            "Proposal has already been selected",
          );

          await tx.assignment.create({
            data: {
              taskId,
              customerId: authUser.id,
              executorId: proposal.executorId,
              selectedProposalId: proposal.id,
            },
          });

          await createNotification(tx, {
            userId: proposal.executorId,
            type: NotificationType.EXECUTOR_SELECTED,
            title: "Вас выбрали исполнителем",
            body: `Заказчик выбрал вас исполнителем по задаче "${task.title}".`,
            payload: {
              taskId,
              proposalId: proposal.id,
            },
          });

          return updateTaskStatusWithHistory(tx, {
            taskId,
            fromStatus: task.status,
            toStatus: TaskStatus.IN_PROGRESS,
            changedBy: authUser.id,
          });
        });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: unknown }).code === "P2002"
        ) {
          throw new HttpError(
            400,
            "VALIDATION_ERROR",
            "Executor has already been selected for this task",
          );
        }

        throw error;
      }

      if (updatedTask.assignment?.executorId) {
        void sendTaskBotNotification({
          userId: updatedTask.assignment.executorId,
          type: NotificationType.EXECUTOR_SELECTED,
          title: "Вас выбрали исполнителем",
          body: `Заказчик выбрал вас исполнителем по задаче "${updatedTask.title}".`,
          taskId,
        });
      }

      res.status(200).json({
        task: mapTask(updatedTask),
      });
    } catch (error) {
      next(error);
    }
  },
);

tasksRouter.post("/:id/send-to-review", requireAuth, async (req, res, next) => {
  try {
    const taskId = parseTaskIdOrThrow(req.params.id);
    const authUser = getAuthUser(res);

    const task = await prisma.$transaction(async (tx) => {
      const existingTask = await tx.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          status: true,
          title: true,
          customerId: true,
          assignment: {
            select: {
              executorId: true,
            },
          },
        },
      });

      if (!existingTask) {
        throw new HttpError(404, "NOT_FOUND", "Task not found");
      }

      assertValidation(
        existingTask.status === TaskStatus.IN_PROGRESS,
        "Only IN_PROGRESS tasks can be sent to review",
      );
      assertValidation(
        !!existingTask.assignment,
        "Task has no assigned executor",
      );

      if (existingTask.assignment?.executorId !== authUser.id) {
        throw new HttpError(
          403,
          "FORBIDDEN",
          "Only assigned executor can send task to review",
        );
      }

      await createNotification(tx, {
        userId: existingTask.customerId,
        type: NotificationType.TASK_SENT_TO_REVIEW,
        title: "Задача отправлена на проверку",
        body: `Исполнитель отправил задачу "${existingTask.title}" на проверку.`,
        payload: {
          taskId,
        },
      });

      return updateTaskStatusWithHistory(tx, {
        taskId,
        fromStatus: existingTask.status,
        toStatus: TaskStatus.ON_REVIEW,
        changedBy: authUser.id,
      });
    });

    void sendTaskBotNotification({
      userId: task.customerId,
      type: NotificationType.TASK_SENT_TO_REVIEW,
      title: "Задача отправлена на проверку",
      body: `Исполнитель отправил задачу "${task.title}" на проверку.`,
      taskId,
    });

    res.status(200).json({
      task: mapTask(task),
    });
  } catch (error) {
    next(error);
  }
});

tasksRouter.post("/:id/approve", requireAuth, async (req, res, next) => {
  try {
    const taskId = parseTaskIdOrThrow(req.params.id);
    const authUser = getAuthUser(res);

    const task = await prisma.$transaction(async (tx) => {
      const existingTask = await tx.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          customerId: true,
          title: true,
          status: true,
          assignment: {
            select: {
              id: true,
              executorId: true,
            },
          },
        },
      });

      if (!existingTask) {
        throw new HttpError(404, "NOT_FOUND", "Task not found");
      }

      if (existingTask.customerId !== authUser.id) {
        throw new HttpError(
          403,
          "FORBIDDEN",
          "Only task owner can approve task completion",
        );
      }

      assertValidation(
        existingTask.status === TaskStatus.ON_REVIEW,
        "Only ON_REVIEW tasks can be approved",
      );
      const assignment = existingTask.assignment;
      assertValidation(!!assignment, "Task has no assigned executor");

      await createNotification(tx, {
        userId: assignment!.executorId,
        type: NotificationType.TASK_APPROVED,
        title: "Задача подтверждена",
        body: `Заказчик подтвердил выполнение задачи "${existingTask.title}".`,
        payload: {
          taskId,
        },
      });

      return updateTaskStatusWithHistory(tx, {
        taskId,
        fromStatus: existingTask.status,
        toStatus: TaskStatus.COMPLETED,
        changedBy: authUser.id,
      });
    });

    if (task.assignment?.executorId) {
      void sendTaskBotNotification({
        userId: task.assignment.executorId,
        type: NotificationType.TASK_APPROVED,
        title: "Задача подтверждена",
        body: `Заказчик подтвердил выполнение задачи "${task.title}".`,
        taskId,
      });
    }

    res.status(200).json({
      task: mapTask(task),
    });
  } catch (error) {
    next(error);
  }
});

tasksRouter.post("/:id/reject-review", requireAuth, async (req, res, next) => {
  try {
    const taskId = parseTaskIdOrThrow(req.params.id);
    assertBodyIsObject(req.body);

    const authUser = getAuthUser(res);
    const payload = parseRequiredTaskRejectReview(
      req.body as TaskRejectReviewPayload,
    );

    const task = await prisma.$transaction(async (tx) => {
      const existingTask = await tx.task.findUnique({
        where: { id: taskId },
        select: {
          id: true,
          customerId: true,
          title: true,
          status: true,
          assignment: {
            select: {
              id: true,
              executorId: true,
            },
          },
        },
      });

      if (!existingTask) {
        throw new HttpError(404, "NOT_FOUND", "Task not found");
      }

      if (existingTask.customerId !== authUser.id) {
        throw new HttpError(
          403,
          "FORBIDDEN",
          "Only task owner can reject review",
        );
      }

      assertValidation(
        existingTask.status === TaskStatus.ON_REVIEW,
        "Only ON_REVIEW tasks can be rejected",
      );
      const assignment = existingTask.assignment;
      assertValidation(!!assignment, "Task has no assigned executor");

      await createNotification(tx, {
        userId: assignment!.executorId,
        type: NotificationType.TASK_REJECTED,
        title: "Задача возвращена в работу",
        body: `Заказчик вернул задачу "${existingTask.title}" в работу.`,
        payload: {
          taskId,
          comment: payload.comment,
        },
      });

      return updateTaskStatusWithHistory(tx, {
        taskId,
        fromStatus: existingTask.status,
        toStatus: TaskStatus.IN_PROGRESS,
        changedBy: authUser.id,
        comment: payload.comment,
      });
    });

    if (task.assignment?.executorId) {
      void sendTaskBotNotification({
        userId: task.assignment.executorId,
        type: NotificationType.TASK_REJECTED,
        title: "Задача возвращена в работу",
        body: `Заказчик вернул задачу "${task.title}" в работу.`,
        taskId,
      });
    }

    res.status(200).json({
      task: mapTask(task),
    });
  } catch (error) {
    next(error);
  }
});

tasksRouter.get("/:id/status-history", requireAuth, async (req, res, next) => {
  try {
    const taskId = parseTaskIdOrThrow(req.params.id);

    await getTaskOrThrow(taskId);

    const entries = await prisma.taskStatusHistory.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
      select: statusHistorySelect,
    });

    res.status(200).json({
      items: entries.map(mapTaskStatusHistory),
    });
  } catch (error) {
    next(error);
  }
});

tasksRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const taskId = parseTaskIdOrThrow(req.params.id);

    const task = await getTaskOrThrow(taskId);

    res.status(200).json({
      task: mapTask(task),
    });
  } catch (error) {
    next(error);
  }
});

tasksRouter.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const taskId = parseTaskIdOrThrow(req.params.id);
    assertBodyIsObject(req.body);

    const authUser = getAuthUser(res);
    const existingTask = await getTaskOrThrow(taskId);

    if (existingTask.customerId !== authUser.id) {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Only task owner can edit this task",
      );
    }

    assertValidation(
      existingTask.status === TaskStatus.OPEN,
      "Only OPEN tasks can be edited",
    );

    const payload = req.body as TaskPatchPayload;

    const title = parseOptionalString(payload.title, "title", MAX_TITLE_LENGTH);
    const description = parseOptionalString(
      payload.description,
      "description",
      MAX_DESCRIPTION_LENGTH,
    );
    const budget = parseOptionalBudget(payload.budget);
    const category = parseOptionalString(
      payload.category,
      "category",
      MAX_CATEGORY_LENGTH,
    );
    const deadline = parseOptionalDeadline(payload.deadline_at);
    const tags = parseOptionalTags(payload.tags);

    const hasUpdates =
      title.provided ||
      description.provided ||
      budget.provided ||
      category.provided ||
      deadline.provided ||
      tags.provided;

    assertValidation(hasUpdates, "No valid fields to update");

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(title.provided ? { title: title.normalized } : {}),
        ...(description.provided
          ? { description: description.normalized }
          : {}),
        ...(budget.provided ? { budget: budget.normalized } : {}),
        ...(category.provided ? { category: category.normalized } : {}),
        ...(deadline.provided ? { deadlineAt: deadline.normalized } : {}),
        ...(tags.provided ? { tags: tags.normalized } : {}),
      },
      select: taskSelect,
    });

    res.status(200).json({
      task: mapTask(updatedTask),
    });
  } catch (error) {
    next(error);
  }
});

tasksRouter.post("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const taskId = parseTaskIdOrThrow(req.params.id);

    const authUser = getAuthUser(res);
    const existingTask = await getTaskOrThrow(taskId);

    if (existingTask.customerId !== authUser.id) {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Only task owner can cancel this task",
      );
    }

    assertValidation(
      existingTask.status === TaskStatus.OPEN,
      "Only OPEN tasks can be canceled",
    );

    const task = await prisma.$transaction((tx) =>
      updateTaskStatusWithHistory(tx, {
        taskId,
        fromStatus: existingTask.status,
        toStatus: TaskStatus.CANCELED,
        changedBy: authUser.id,
      }),
    );

    res.status(200).json({
      task: mapTask(task),
    });
  } catch (error) {
    next(error);
  }
});
