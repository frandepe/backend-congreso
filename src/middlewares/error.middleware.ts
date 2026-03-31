import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { env } from "../config/env";
import { sendError } from "../utils/api-response";
import { HttpError } from "../utils/http-error";

const errorMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error(
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : "Unknown application error",
  );

  if (error instanceof SyntaxError && "body" in error) {
    sendError(
      res,
      {
        code: "INVALID_JSON",
        message: "Invalid JSON body",
      },
      400,
    );
    return;
  }

  if (error instanceof MulterError) {
    const isFileTooLarge = error.code === "LIMIT_FILE_SIZE";

    sendError(
      res,
      {
        code: isFileTooLarge ? "FILE_TOO_LARGE" : "UPLOAD_ERROR",
        message: isFileTooLarge ? "File is too large" : "Upload failed",
      },
      400,
    );
    return;
  }

  if (error instanceof ZodError) {
    sendError(
      res,
      {
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: error.flatten(),
      },
      400,
    );
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const isUniqueConstraint = error.code === "P2002";

    sendError(
      res,
      {
        code: isUniqueConstraint ? "CONFLICT" : "DATABASE_ERROR",
        message: isUniqueConstraint ? "Conflict" : "Database operation failed",
      },
      isUniqueConstraint ? 409 : 500,
    );
    return;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    sendError(
      res,
      {
        code: "DATABASE_VALIDATION_ERROR",
        message: "Database validation failed",
      },
      400,
    );
    return;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    sendError(
      res,
      {
        code: "DATABASE_CONNECTION_ERROR",
        message: "Database connection failed",
      },
      500,
    );
    return;
  }

  if (error instanceof HttpError) {
    sendError(
      res,
      {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      error.statusCode,
    );
    return;
  }

  const message =
    error instanceof Error && env.nodeEnv !== "production"
      ? error.message
      : "Internal server error";

  sendError(
    res,
    {
      code: "INTERNAL_SERVER_ERROR",
      message,
    },
    500,
  );
};

export { errorMiddleware };
