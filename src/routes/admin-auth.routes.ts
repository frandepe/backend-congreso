import { Router } from "express";
import {
  getCurrentAdminController,
  loginAdminController,
} from "../controllers/admin-auth.controller";
import { loginRateLimiter } from "../config/rate-limit";
import { requireAdminAuth } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import { loginBodySchema } from "../validators/auth.validators";

const adminAuthRouter = Router();

adminAuthRouter.post(
  "/login",
  // loginRateLimiter,
  validateBody(loginBodySchema),
  asyncHandler(loginAdminController),
);

adminAuthRouter.get(
  "/me",
  asyncHandler(requireAdminAuth),
  getCurrentAdminController,
);

export { adminAuthRouter };
