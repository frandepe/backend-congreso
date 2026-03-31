import type { Request, Response } from "express";
import { sendError } from "../utils/api-response";

const notFoundMiddleware = (_req: Request, res: Response): void => {
  sendError(
    res,
    {
      code: "NOT_FOUND",
      message: "Route not found",
    },
    404,
  );
};

export { notFoundMiddleware };
