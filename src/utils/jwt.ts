import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import type { AdminJwtPayload } from "../types/auth.types";
import { HttpError } from "./http-error";

const getJwtSecret = (): string => {
  if (!env.jwtSecret) {
    throw new HttpError(500, "JWT_CONFIGURATION_ERROR", "JWT is not configured");
  }

  return env.jwtSecret;
};

const signAdminToken = (payload: AdminJwtPayload): string => {
  const secret = getJwtSecret();

  return jwt.sign(payload, secret, {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  });
};

const verifyAdminToken = (token: string): AdminJwtPayload => {
  const secret = getJwtSecret();
  const decoded = jwt.verify(token, secret);

  if (typeof decoded === "string") {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }

  const payload = decoded as JwtPayload;

  if (typeof payload.sub !== "string" || typeof payload.role !== "string") {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }

  return {
    sub: payload.sub,
    role: payload.role as AdminJwtPayload["role"],
  };
};

export { signAdminToken, verifyAdminToken };
