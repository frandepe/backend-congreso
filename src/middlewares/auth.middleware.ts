import type { NextFunction, Request, Response } from "express";
import { getAdminById } from "../services/auth.service";
import { verifyAdminToken } from "../utils/jwt";
import { HttpError } from "../utils/http-error";

const extractBearerToken = (authorizationHeader: string | undefined): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

const requireAdminAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    next(new HttpError(401, "UNAUTHORIZED", "Unauthorized"));
    return;
  }

  try {
    const payload = verifyAdminToken(token);
    const admin = await getAdminById(payload.sub);

    if (!admin || !admin.isActive) {
      next(new HttpError(401, "UNAUTHORIZED", "Unauthorized"));
      return;
    }

    req.admin = admin;
    next();
  } catch {
    next(new HttpError(401, "UNAUTHORIZED", "Unauthorized"));
  }
};

export { requireAdminAuth };
