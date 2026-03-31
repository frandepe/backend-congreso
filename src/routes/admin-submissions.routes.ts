import { Router } from "express";
import {
  getAdminSubmissionDetailController,
  listAdminSubmissionsController,
  updateAdminSubmissionController,
} from "../controllers/admin-submissions.controller";
import { requireAdminAuth } from "../middlewares/auth.middleware";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
  adminSubmissionListQuerySchema,
  adminSubmissionParamsSchema,
  adminSubmissionUpdateBodySchema,
} from "../validators/admin-submission.validators";

const adminSubmissionsRouter = Router();

adminSubmissionsRouter.use(asyncHandler(requireAdminAuth));

adminSubmissionsRouter.get(
  "/",
  validateQuery(adminSubmissionListQuerySchema),
  asyncHandler(listAdminSubmissionsController),
);

adminSubmissionsRouter.get(
  "/:id",
  validateParams(adminSubmissionParamsSchema),
  asyncHandler(getAdminSubmissionDetailController),
);

adminSubmissionsRouter.patch(
  "/:id",
  validateParams(adminSubmissionParamsSchema),
  validateBody(adminSubmissionUpdateBodySchema),
  asyncHandler(updateAdminSubmissionController),
);

export { adminSubmissionsRouter };
