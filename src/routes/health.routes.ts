import { Router } from "express";
import { getDbPing, getHealth, getPing } from "../controllers/health.controller";
import { asyncHandler } from "../utils/async-handler";

const healthRouter = Router();

healthRouter.get("/health", asyncHandler(async (req, res) => getHealth(req, res)));
healthRouter.get("/ping", asyncHandler(async (req, res) => getPing(req, res)));
healthRouter.get("/db-ping", asyncHandler(async (req, res) => getDbPing(req, res)));

export { healthRouter };
