import { TaskStatus, type Prisma } from "@prisma/client";
import { Router } from "express";

import { HttpError } from "../../common/http-error";
import { assertBodyIsObject, assertValidation } from "../../common/validation";
import { prisma } from "../../config/prisma";
import { getAuthUser, requireAuth } from "../auth/auth.middleware";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_PROPOSAL_COMMENT_LENGTH = 3000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type ProposalPatchPayload = {
  price?: unknown;
  comment?: unknown;
  eta_days?: unknown;
};

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
    },
  },
} satisfies Prisma.ProposalSelect;

type ProposalView = Prisma.ProposalGetPayload<{
  select: typeof proposalSelect;
}>;

const myProposalSelect = {
  id: true,
  taskId: true,
  executorId: true,
  price: true,
  comment: true,
  etaDays: true,
  createdAt: true,
  updatedAt: true,
  task: {
    select: {
      id: true,
      title: true,
      status: true,
      deadlineAt: true,
      category: true,
      customer: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
  },
} satisfies Prisma.ProposalSelect;

type MyProposalView = Prisma.ProposalGetPayload<{
  select: typeof myProposalSelect;
}>;

const parseProposalIdOrThrow = (id: unknown): string => {
  assertValidation(typeof id === "string", "id must be a valid UUID");

  const proposalId = id as string;
  assertValidation(UUID_PATTERN.test(proposalId), "id must be a valid UUID");

  return proposalId;
};

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

const parseOptionalTaskStatus = (value: unknown): TaskStatus | undefined => {
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

const normalizeString = (value: string): string => value.trim();

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

const parseOptionalComment = (
  value: unknown,
): { provided: boolean; normalized?: string } => {
  if (value === undefined) {
    return { provided: false };
  }

  assertValidation(typeof value === "string", "comment must be a string");

  const normalized = normalizeString(value as string);

  assertValidation(normalized.length > 0, "comment is required");
  assertValidation(
    normalized.length <= MAX_PROPOSAL_COMMENT_LENGTH,
    `comment must be at most ${MAX_PROPOSAL_COMMENT_LENGTH} characters`,
  );

  return {
    provided: true,
    normalized,
  };
};

const parseOptionalPrice = (
  value: unknown,
): { provided: boolean; normalized?: string } => {
  if (value === undefined) {
    return { provided: false };
  }

  return {
    provided: true,
    normalized: parsePositiveNumber(value, "price"),
  };
};

const parseOptionalEtaDays = (
  value: unknown,
): { provided: boolean; normalized?: number } => {
  if (value === undefined) {
    return { provided: false };
  }

  return {
    provided: true,
    normalized: parsePositiveInteger(value, "eta_days"),
  };
};

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
      }
    : null,
});

const mapMyProposal = (proposal: MyProposalView) => ({
  id: proposal.id,
  taskId: proposal.taskId,
  executorId: proposal.executorId,
  price: Number(proposal.price.toString()),
  comment: proposal.comment,
  etaDays: proposal.etaDays,
  createdAt: proposal.createdAt.toISOString(),
  updatedAt: proposal.updatedAt.toISOString(),
  task: {
    id: proposal.task.id,
    title: proposal.task.title,
    status: proposal.task.status,
    deadlineAt: proposal.task.deadlineAt
      ? proposal.task.deadlineAt.toISOString()
      : null,
    category: proposal.task.category,
    customer: proposal.task.customer
      ? {
          id: proposal.task.customer.id,
          username: proposal.task.customer.username,
          displayName: proposal.task.customer.displayName,
        }
      : null,
  },
});

const getProposalContextOrThrow = async (proposalId: string) => {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      executorId: true,
      task: {
        select: {
          id: true,
          status: true,
          assignment: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!proposal) {
    throw new HttpError(404, "NOT_FOUND", "Proposal not found");
  }

  return proposal;
};

const assertProposalCanBeChanged = (
  proposal: Awaited<ReturnType<typeof getProposalContextOrThrow>>,
  authUserId: string,
): void => {
  if (proposal.executorId !== authUserId) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Only proposal author can modify this proposal",
    );
  }

  assertValidation(
    proposal.task.status === TaskStatus.OPEN,
    "Only OPEN task proposals can be modified",
  );
  assertValidation(
    !proposal.task.assignment,
    "Proposal cannot be modified after executor selection",
  );
};

export const proposalsRouter = Router();

proposalsRouter.get("/my", requireAuth, async (req, res, next) => {
  try {
    const authUser = getAuthUser(res);
    const page = parsePositiveInt(req.query.page, "page", 1);
    const limit = parsePositiveInt(req.query.limit, "limit", DEFAULT_LIMIT);
    assertValidation(limit <= MAX_LIMIT, `limit must be at most ${MAX_LIMIT}`);
    const status = parseOptionalTaskStatus(req.query.status);
    const skip = (page - 1) * limit;

    const where: Prisma.ProposalWhereInput = {
      executorId: authUser.id,
      ...(status
        ? {
            task: {
              status,
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.proposal.count({ where }),
      prisma.proposal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: myProposalSelect,
      }),
    ]);

    res.status(200).json({
      items: items.map(mapMyProposal),
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

proposalsRouter.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const proposalId = parseProposalIdOrThrow(req.params.id);
    assertBodyIsObject(req.body);

    const authUser = getAuthUser(res);
    const context = await getProposalContextOrThrow(proposalId);
    assertProposalCanBeChanged(context, authUser.id);

    const payload = req.body as ProposalPatchPayload;
    const price = parseOptionalPrice(payload.price);
    const comment = parseOptionalComment(payload.comment);
    const etaDays = parseOptionalEtaDays(payload.eta_days);

    const hasUpdates = price.provided || comment.provided || etaDays.provided;
    assertValidation(hasUpdates, "No valid fields to update");

    const proposal = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        ...(price.provided ? { price: price.normalized } : {}),
        ...(comment.provided ? { comment: comment.normalized } : {}),
        ...(etaDays.provided ? { etaDays: etaDays.normalized } : {}),
      },
      select: proposalSelect,
    });

    res.status(200).json({
      proposal: mapProposal(proposal),
    });
  } catch (error) {
    next(error);
  }
});

proposalsRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const proposalId = parseProposalIdOrThrow(req.params.id);
    const authUser = getAuthUser(res);

    const context = await getProposalContextOrThrow(proposalId);
    assertProposalCanBeChanged(context, authUser.id);

    await prisma.proposal.delete({
      where: { id: proposalId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
