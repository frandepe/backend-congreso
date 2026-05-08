import type { Request, Response } from "express";
import { sendSuccess } from "../utils/api-response";
import { prisma } from "../lib/prisma";

const getHealth = (_req: Request, res: Response): void => {
  sendSuccess(res, { status: "ok" });
};

const getPing = (_req: Request, res: Response): void => {
  sendSuccess(res, { status: "ok" });
};

const getDbPing = async (_req: Request, res: Response): Promise<void> => {
  await prisma.$queryRaw`SELECT 1`;

  sendSuccess(res, { status: "ok", database: "ok" });
};

export { getHealth, getPing, getDbPing };
