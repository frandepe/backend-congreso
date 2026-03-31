import rateLimit from "express-rate-limit";
import { sendError } from "../utils/api-response";

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;

const createRateLimiter = (max: number) =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES_IN_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      sendError(
        res,
        {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests",
        },
        429,
      );
    },
  });

const loginRateLimiter = createRateLimiter(5);
const submissionCreateRateLimiter = createRateLimiter(10);
const additionalReceiptRateLimiter = createRateLimiter(10);

export {
  additionalReceiptRateLimiter,
  loginRateLimiter,
  submissionCreateRateLimiter,
};
