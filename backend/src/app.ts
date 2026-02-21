import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorHandler } from "./common/error-handler";
import { notFoundHandler } from "./common/not-found";
import { requestContextMiddleware } from "./common/request-context";
import { requestLoggerMiddleware } from "./common/request-logger";
import { adminRouter } from "./modules/admin/admin.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { healthRouter } from "./modules/health/health.routes";
import { profileRouter } from "./modules/profile/profile.routes";
import { proposalsRouter } from "./modules/proposals/proposals.routes";
import { rootRouter } from "./modules/root/root.routes";
import { tasksRouter } from "./modules/tasks/tasks.routes";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(requestContextMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(express.json({ limit: "1mb" }));

  app.use("/", rootRouter);
  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/admin", adminRouter);
  app.use("/profile", profileRouter);
  app.use("/tasks", tasksRouter);
  app.use("/proposals", proposalsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
