import type { AdminRole } from "@prisma/client";

export type AuthenticatedAdmin = {
  id: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminJwtPayload = {
  sub: string;
  role: AdminRole;
};
