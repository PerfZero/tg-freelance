import { Router } from "express";

export const rootRouter = Router();

rootRouter.get("/", (_req, res) => {
  res.status(200).json({
    name: "TG Freelance API",
    version: "0.1.0"
  });
});
