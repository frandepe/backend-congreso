import type { Response } from "express";
import type {
  ApiErrorPayload,
  ApiErrorResponse,
  ApiMeta,
  ApiSuccessResponse,
} from "../types/api.types";

const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiMeta,
): Response<ApiSuccessResponse<T>> => {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

const sendError = (
  res: Response,
  error: ApiErrorPayload,
  statusCode = 500,
): Response<ApiErrorResponse> => {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  };

  if (error.details !== undefined) {
    payload.error.details = error.details;
  }

  return res.status(statusCode).json(payload);
};

export { sendError, sendSuccess };
