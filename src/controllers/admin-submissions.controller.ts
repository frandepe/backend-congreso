import type { Request, Response } from "express";
import {
  getAdminSubmissionDetail,
  listAdminSubmissions,
  updateAdminSubmission,
} from "../services/admin-submission.service";
import { sendSuccess } from "../utils/api-response";

const listAdminSubmissionsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const result = await listAdminSubmissions({
    page: Number(req.query.page),
    pageSize: Number(req.query.pageSize),
    status: req.query.status as string | undefined,
    registrationOptionCode: req.query.registrationOptionCode as string | undefined,
    paymentPlanType: req.query.paymentPlanType as string | undefined,
  });

  sendSuccess(res, result.items, 200, result.meta);
};

const getAdminSubmissionDetailController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const result = await getAdminSubmissionDetail(String(req.params.id));
  sendSuccess(res, result);
};

const updateAdminSubmissionController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const result = await updateAdminSubmission({
    submissionId: String(req.params.id),
    status: req.body.status as string | undefined,
    internalNote: req.body.internalNote as string | null | undefined,
    admin: req.admin!,
  });

  sendSuccess(res, result);
};

export {
  getAdminSubmissionDetailController,
  listAdminSubmissionsController,
  updateAdminSubmissionController,
};
