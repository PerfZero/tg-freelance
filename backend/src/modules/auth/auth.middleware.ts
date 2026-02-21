import type { NextFunction, Request, Response } from "express";

import { HttpError } from "../../common/http-error";
import { prisma } from "../../config/prisma";
import { verifyAuthToken } from "./auth.token";
import type { UserWithProfile } from "./auth.types";

type AuthLocals = {
  authUser?: UserWithProfile;
};

const getBearerToken = (req: Request): string => {
  const authorization = req.header("authorization");
  if (!authorization) {
    throw new HttpError(401, "UNAUTHORIZED", "Authorization header is required");
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new HttpError(401, "UNAUTHORIZED", "Authorization header must be Bearer token");
  }

  return token;
};

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = getBearerToken(req);
    const payload = verifyAuthToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { profile: true }
    });

    if (!user) {
      throw new HttpError(401, "UNAUTHORIZED", "User is not found for this token");
    }

    if (user.isBlocked) {
      throw new HttpError(403, "FORBIDDEN", "User is blocked");
    }

    (res.locals as AuthLocals).authUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const getAuthUser = (res: Response): UserWithProfile => {
  const user = (res.locals as AuthLocals).authUser;
  if (!user) {
    throw new HttpError(500, "INTERNAL_ERROR", "Auth user is missing in request context");
  }

  return user;
};
