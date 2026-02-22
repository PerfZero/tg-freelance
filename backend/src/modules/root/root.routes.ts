import { Router } from "express";

import { prisma } from "../../config/prisma";

export const rootRouter = Router();

rootRouter.get("/", (_req, res) => {
  res.status(200).json({
    name: "TG Freelance API",
    version: "0.1.0",
  });
});

rootRouter.get("/stats", async (_req, res, next) => {
  try {
    const totalUsers = await prisma.user.count();

    res.status(200).json({
      totalUsers,
    });
  } catch (error) {
    next(error);
  }
});
