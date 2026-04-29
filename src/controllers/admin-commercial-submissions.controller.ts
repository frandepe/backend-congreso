import type { Request, Response } from "express";
import {
  getAdminCommercialSubmissionDetail,
  listAdminCommercialSubmissions,
  updateAdminCommercialSubmission,
} from "../services/admin-commercial-submission.service";
import { sendSuccess } from "../utils/api-response";

const listAdminCommercialSubmissionsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const result = await listAdminCommercialSubmissions({
    page: Number(req.query.page),
    pageSize: Number(req.query.pageSize),
    status: req.query.status as string | undefined,
    commercialKind: req.query.commercialKind as string | undefined,
    commercialOptionCode: req.query.commercialOptionCode as string | undefined,
    hasDiscountCoupon: req.query.hasDiscountCoupon as string | undefined,
  });

  sendSuccess(res, result.items, 200, result.meta);
};

const getAdminCommercialSubmissionDetailController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const result = await getAdminCommercialSubmissionDetail(String(req.params.id));
  sendSuccess(res, result);
};

const updateAdminCommercialSubmissionController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const result = await updateAdminCommercialSubmission({
    submissionId: String(req.params.id),
    status: req.body.status as string | undefined,
    internalNote: req.body.internalNote as string | null | undefined,
    admin: req.admin!,
  });

  sendSuccess(res, result);
};

export {
  getAdminCommercialSubmissionDetailController,
  listAdminCommercialSubmissionsController,
  updateAdminCommercialSubmissionController,
};
