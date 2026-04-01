import { Router } from "express";
import {
  getAdminCommercialSubmissionDetailController,
  listAdminCommercialSubmissionsController,
  updateAdminCommercialSubmissionController,
} from "../controllers/admin-commercial-submissions.controller";
import { requireAdminAuth } from "../middlewares/auth.middleware";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
  adminCommercialSubmissionListQuerySchema,
  adminCommercialSubmissionParamsSchema,
  adminCommercialSubmissionUpdateBodySchema,
} from "../validators/admin-commercial-submission.validators";

const adminCommercialSubmissionsRouter = Router();

adminCommercialSubmissionsRouter.use(asyncHandler(requireAdminAuth));

adminCommercialSubmissionsRouter.get(
  "/",
  validateQuery(adminCommercialSubmissionListQuerySchema),
  asyncHandler(listAdminCommercialSubmissionsController),
);

adminCommercialSubmissionsRouter.get(
  "/:id",
  validateParams(adminCommercialSubmissionParamsSchema),
  asyncHandler(getAdminCommercialSubmissionDetailController),
);

adminCommercialSubmissionsRouter.patch(
  "/:id",
  validateParams(adminCommercialSubmissionParamsSchema),
  validateBody(adminCommercialSubmissionUpdateBodySchema),
  asyncHandler(updateAdminCommercialSubmissionController),
);

export { adminCommercialSubmissionsRouter };
