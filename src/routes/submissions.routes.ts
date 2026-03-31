import { Router } from "express";
import {
  additionalReceiptRateLimiter,
  submissionCreateRateLimiter,
} from "../config/rate-limit";
import {
  createAdditionalReceiptController,
  createInitialSubmissionController,
  findPendingSecondInstallmentController,
  getPublicSubmissionStatusController,
  recoverTrackingCodeController,
} from "../controllers/submissions.controller";
import { uploadReceiptFile } from "../middlewares/upload.middleware";
import { validateBody, validateParams } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
  additionalReceiptBodySchema,
  pendingSecondInstallmentLookupBodySchema,
  recoverTrackingCodeBodySchema,
  submissionBodySchema,
  submissionIdParamsSchema,
  submissionStatusParamsSchema,
} from "../validators/submission.validators";

const submissionsRouter = Router();

submissionsRouter.post(
  "/submissions",
  submissionCreateRateLimiter,
  uploadReceiptFile,
  validateBody(submissionBodySchema),
  asyncHandler(createInitialSubmissionController),
);

submissionsRouter.post(
  "/submissions/recover-tracking-code",
  validateBody(recoverTrackingCodeBodySchema),
  asyncHandler(recoverTrackingCodeController),
);

submissionsRouter.post(
  "/submissions/check-pending-second-installment",
  validateBody(pendingSecondInstallmentLookupBodySchema),
  asyncHandler(findPendingSecondInstallmentController),
);

submissionsRouter.post(
  "/submissions/:id/receipts",
  additionalReceiptRateLimiter,
  uploadReceiptFile,
  asyncHandler(validateParams(submissionIdParamsSchema)),
  validateBody(additionalReceiptBodySchema),
  asyncHandler(createAdditionalReceiptController),
);

submissionsRouter.get(
  "/submissions/:id/status",
  asyncHandler(validateParams(submissionStatusParamsSchema)),
  asyncHandler(getPublicSubmissionStatusController),
);

export { submissionsRouter };
