import type { Request, Response } from "express";
import { sendSuccess } from "../utils/api-response";

const getHealth = (_req: Request, res: Response): void => {
  sendSuccess(res, { status: "ok" });
};

const getPing = (_req: Request, res: Response): void => {
  sendSuccess(res, { status: "ok" });
};

export { getHealth, getPing };
