import type { Request, Response } from "express";
import {
  createAdditionalReceipt,
  createInitialSubmission,
  findPendingSecondInstallment,
  getPublicSubmissionStatus,
  recoverTrackingCode,
} from "../services/submission.service";
import { sendSuccess } from "../utils/api-response";
import { HttpError } from "../utils/http-error";
import type {
  CreateAdditionalReceiptInput,
  CreateInitialSubmissionInput,
  FindPendingSecondInstallmentInput,
  RecoverTrackingCodeInput,
} from "../types/submission.types";

const createInitialSubmissionController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.file) {
    throw new HttpError(400, "RECEIPT_FILE_REQUIRED", "Receipt file is required");
  }

  const result = await createInitialSubmission(
    req.body as CreateInitialSubmissionInput,
    req.file,
  );

  sendSuccess(res, result, 201);
};

const createAdditionalReceiptController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.file) {
    throw new HttpError(400, "RECEIPT_FILE_REQUIRED", "Receipt file is required");
  }

  const result = await createAdditionalReceipt(
    {
      ...(req.body as Omit<CreateAdditionalReceiptInput, "registrationId">),
      registrationId: String(req.params.id),
    },
    req.file,
  );

  sendSuccess(res, result, 201);
};

const getPublicSubmissionStatusController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const result = await getPublicSubmissionStatus(String(req.params.id));
  sendSuccess(res, result);
};

const recoverTrackingCodeController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const result = await recoverTrackingCode(req.body as RecoverTrackingCodeInput);
  sendSuccess(res, result);
};

const findPendingSecondInstallmentController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const result = await findPendingSecondInstallment(
    req.body as FindPendingSecondInstallmentInput,
  );
  sendSuccess(res, result);
};

export {
  createAdditionalReceiptController,
  createInitialSubmissionController,
  findPendingSecondInstallmentController,
  getPublicSubmissionStatusController,
  recoverTrackingCodeController,
};
