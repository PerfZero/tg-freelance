import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorHandler } from "./common/error-handler";
import { notFoundHandler } from "./common/not-found";
import { healthRouter } from "./modules/health/health.routes";
import { rootRouter } from "./modules/root/root.routes";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use("/", rootRouter);
  app.use("/health", healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
