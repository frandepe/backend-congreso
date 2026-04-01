import type { Request, Response } from "express";
import {
  createCommercialAdditionalReceipt,
  createCommercialSubmission,
  getCommercialPricingCatalog,
  getCommercialSubmissionStatus,
  recoverCommercialTrackingCode,
  requestCommercialStandDiscountCoupon,
  validateCommercialStandDiscountCoupon,
} from "../services/commercial-submission.service";
import { sendSuccess } from "../utils/api-response";
import { HttpError } from "../utils/http-error";
import type {
  CreateCommercialAdditionalReceiptInput,
  CreateCommercialSubmissionInput,
  RecoverCommercialTrackingCodeInput,
  RequestCommercialStandDiscountCouponInput,
  ValidateCommercialStandDiscountCouponInput,
} from "../types/commercial-submission.types";

const getCommercialPricingCatalogController = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const result = await getCommercialPricingCatalog();
  sendSuccess(res, result);
};

const requestCommercialStandDiscountCouponController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const result = await requestCommercialStandDiscountCoupon(
    req.body as RequestCommercialStandDiscountCouponInput,
  );
  sendSuccess(res, result);
};

const validateCommercialStandDiscountCouponController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const result = await validateCommercialStandDiscountCoupon(
    req.body as ValidateCommercialStandDiscountCouponInput,
  );
  sendSuccess(res, result);
};

const createCommercialSubmissionController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.file) {
    throw new HttpError(400, "RECEIPT_FILE_REQUIRED", "Receipt file is required");
  }

  const result = await createCommercialSubmission(
    req.body as CreateCommercialSubmissionInput,
    req.file,
  );

  sendSuccess(res, result, 201);
};

const createCommercialAdditionalReceiptController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.file) {
    throw new HttpError(400, "RECEIPT_FILE_REQUIRED", "Receipt file is required");
  }

  const result = await createCommercialAdditionalReceipt(
    String(req.params.id ?? ""),
    req.body as CreateCommercialAdditionalReceiptInput,
    req.file,
  );

  sendSuccess(res, result, 201);
};

const getCommercialSubmissionStatusController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const result = await getCommercialSubmissionStatus(String(req.params.id ?? ""));
  sendSuccess(res, result);
};

const recoverCommercialTrackingCodeController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const result = await recoverCommercialTrackingCode(
    req.body as RecoverCommercialTrackingCodeInput,
  );
  sendSuccess(res, result);
};

export {
  createCommercialAdditionalReceiptController,
  createCommercialSubmissionController,
  getCommercialPricingCatalogController,
  getCommercialSubmissionStatusController,
  recoverCommercialTrackingCodeController,
  requestCommercialStandDiscountCouponController,
  validateCommercialStandDiscountCouponController,
};
