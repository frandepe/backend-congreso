import { Router } from "express";
import { getHealth, getPing } from "../controllers/health.controller";
import { asyncHandler } from "../utils/async-handler";

const healthRouter = Router();

healthRouter.get("/health", asyncHandler(async (req, res) => getHealth(req, res)));
healthRouter.get("/ping", asyncHandler(async (req, res) => getPing(req, res)));

export { healthRouter };
