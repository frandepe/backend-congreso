import { prisma } from "../lib/prisma";
import type { AuthenticatedAdmin } from "../types/auth.types";
import { toAdminAuthResponseDto, toAdminDto } from "../mappers/admin.mapper";
import { comparePassword } from "../utils/password";
import { signAdminToken } from "../utils/jwt";
import { HttpError } from "../utils/http-error";

type LoginInput = {
  email: string;
  password: string;
};

const INVALID_CREDENTIALS_MESSAGE = "Email o contraseña incorrecta";

const toAuthenticatedAdmin = (admin: {
  id: string;
  email: string;
  role: AuthenticatedAdmin["role"];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AuthenticatedAdmin => {
  return {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    isActive: admin.isActive,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
};

const loginAdmin = async ({ email, password }: LoginInput) => {
  const admin = await prisma.adminUser.findUnique({
    where: {
      email,
    },
  });

  if (!admin) {
    throw new HttpError(
      401,
      "INVALID_CREDENTIALS",
      INVALID_CREDENTIALS_MESSAGE,
    );
  }

  const isPasswordValid = await comparePassword(password, admin.passwordHash);

  if (!isPasswordValid || !admin.isActive) {
    throw new HttpError(
      401,
      "INVALID_CREDENTIALS",
      INVALID_CREDENTIALS_MESSAGE,
    );
  }

  const authAdmin = toAuthenticatedAdmin(admin);
  const token = signAdminToken({
    sub: admin.id,
    role: admin.role,
  });

  return toAdminAuthResponseDto(authAdmin, token);
};

const getAdminById = async (
  adminId: string,
): Promise<AuthenticatedAdmin | null> => {
  const admin = await prisma.adminUser.findUnique({
    where: {
      id: adminId,
    },
  });

  if (!admin) {
    return null;
  }

  return toAdminDto(toAuthenticatedAdmin(admin));
};

export { getAdminById, loginAdmin };
