import type { Request, Response } from "express";
import { toAdminDto } from "../mappers/admin.mapper";
import { loginAdmin } from "../services/auth.service";
import { sendSuccess } from "../utils/api-response";

const loginAdminController = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as {
    email: string;
    password: string;
  };

  const result = await loginAdmin({
    email,
    password,
  });

  sendSuccess(res, result);
};

const getCurrentAdminController = (req: Request, res: Response): void => {
  sendSuccess(res, {
    admin: toAdminDto(req.admin!),
  });
};

export { getCurrentAdminController, loginAdminController };
