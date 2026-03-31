import type { AuthenticatedAdmin } from "./auth.types";

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedAdmin;
    }
  }
}

export {};
