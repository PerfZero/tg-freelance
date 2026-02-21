import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

export const REQUEST_ID_HEADER = "x-request-id";

const REQUEST_ID_MAX_LENGTH = 128;

type ContextLocals = {
  requestId?: string;
  requestStartNs?: bigint;
};

const isSafeRequestId = (value: string): boolean => {
  if (!value || value.length > REQUEST_ID_MAX_LENGTH) {
    return false;
  }

  return /^[a-zA-Z0-9-_.]+$/.test(value);
};

export const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const incoming = req.header(REQUEST_ID_HEADER);
  const requestId = incoming && isSafeRequestId(incoming) ? incoming : randomUUID();

  const locals = res.locals as ContextLocals;
  locals.requestId = requestId;
  locals.requestStartNs = process.hrtime.bigint();

  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
};

export const getRequestId = (res: Response): string => {
  const locals = res.locals as ContextLocals;
  return locals.requestId ?? "unknown";
};

export const getRequestStartNs = (res: Response): bigint => {
  const locals = res.locals as ContextLocals;
  return locals.requestStartNs ?? process.hrtime.bigint();
};
