import type { CorsOptions } from "cors";
import { env } from "./env";
import { HttpError } from "../utils/http-error";

const isOriginAllowed = (origin: string): boolean => {
  return env.corsAllowedOrigins.includes(origin);
};

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }

    callback(new HttpError(403, "http://localhost:5173", "Origin not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

export { corsOptions };
