import { Router } from "express";
import {
  commercialAdditionalReceiptRateLimiter,
  commercialDiscountCouponRateLimiter,
  commercialSubmissionCreateRateLimiter,
  commercialTrackingRecoveryRateLimiter,
} from "../config/rate-limit";
import {
  createCommercialAdditionalReceiptController,
  createCommercialSubmissionController,
  getCommercialPricingCatalogController,
  getCommercialSubmissionStatusController,
  recoverCommercialTrackingCodeController,
  requestCommercialStandDiscountCouponController,
  validateCommercialStandDiscountCouponController,
} from "../controllers/commercial-submissions.controller";
import { uploadReceiptFile } from "../middlewares/upload.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
  commercialAdditionalReceiptBodySchema,
  commercialRequestDiscountCouponBodySchema,
  commercialSubmissionBodySchema,
  commercialTrackingCodeRecoveryBodySchema,
  commercialValidateDiscountCouponBodySchema,
} from "../validators/commercial-submission.validators";

const commercialSubmissionsRouter = Router();

commercialSubmissionsRouter.get(
  "/commercial-submissions/pricing",
  asyncHandler(getCommercialPricingCatalogController),
);

commercialSubmissionsRouter.post(
  "/commercial-submissions/request-stand-discount-coupon",
  commercialDiscountCouponRateLimiter,
  validateBody(commercialRequestDiscountCouponBodySchema),
  asyncHandler(requestCommercialStandDiscountCouponController),
);

commercialSubmissionsRouter.post(
  "/commercial-submissions/validate-stand-discount-coupon",
  validateBody(commercialValidateDiscountCouponBodySchema),
  asyncHandler(validateCommercialStandDiscountCouponController),
);

commercialSubmissionsRouter.post(
  "/commercial-submissions",
  commercialSubmissionCreateRateLimiter,
  uploadReceiptFile,
  validateBody(commercialSubmissionBodySchema),
  asyncHandler(createCommercialSubmissionController),
);

commercialSubmissionsRouter.post(
  "/commercial-submissions/recover-tracking-code",
  commercialTrackingRecoveryRateLimiter,
  validateBody(commercialTrackingCodeRecoveryBodySchema),
  asyncHandler(recoverCommercialTrackingCodeController),
);

commercialSubmissionsRouter.get(
  "/commercial-submissions/:id/status",
  asyncHandler(getCommercialSubmissionStatusController),
);

commercialSubmissionsRouter.post(
  "/commercial-submissions/:id/receipts",
  commercialAdditionalReceiptRateLimiter,
  uploadReceiptFile,
  validateBody(commercialAdditionalReceiptBodySchema),
  asyncHandler(createCommercialAdditionalReceiptController),
);

export { commercialSubmissionsRouter };
