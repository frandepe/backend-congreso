import { Router } from "express";
import {
  additionalReceiptRateLimiter,
  discountCouponRateLimiter,
  submissionCreateRateLimiter,
} from "../config/rate-limit";
import {
  createAdditionalReceiptController,
  createInitialSubmissionController,
  findPendingSecondInstallmentController,
  getPublicPricingCatalogController,
  getPublicSubmissionStatusController,
  requestDiscountCouponController,
  recoverTrackingCodeController,
  validateDiscountCouponController,
} from "../controllers/submissions.controller";
import { uploadReceiptFile } from "../middlewares/upload.middleware";
import { validateBody, validateParams } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
  additionalReceiptBodySchema,
  pendingSecondInstallmentLookupBodySchema,
  requestDiscountCouponBodySchema,
  recoverTrackingCodeBodySchema,
  submissionBodySchema,
  submissionIdParamsSchema,
  submissionStatusParamsSchema,
  validateDiscountCouponBodySchema,
} from "../validators/submission.validators";

const submissionsRouter = Router();

submissionsRouter.get(
  "/submissions/pricing",
  asyncHandler(getPublicPricingCatalogController),
);

submissionsRouter.post(
  "/submissions/request-discount-coupon",
  discountCouponRateLimiter,
  validateBody(requestDiscountCouponBodySchema),
  asyncHandler(requestDiscountCouponController),
);

submissionsRouter.post(
  "/submissions/validate-discount-coupon",
  validateBody(validateDiscountCouponBodySchema),
  asyncHandler(validateDiscountCouponController),
);

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
