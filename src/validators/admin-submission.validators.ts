import {
  PaymentPlanType,
  RegistrationOptionCode,
  RegistrationStatus,
} from "@prisma/client";
import { z } from "zod";

const adminSubmissionParamsSchema = z.object({
  id: z.string().trim().min(1),
});

const adminSubmissionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(50).optional().default(20),
  status: z.nativeEnum(RegistrationStatus).optional(),
  registrationOptionCode: z.nativeEnum(RegistrationOptionCode).optional(),
  paymentPlanType: z.nativeEnum(PaymentPlanType).optional(),
  hasDiscountCoupon: z.enum(["true"]).optional(),
});

const normalizeOptionalNote = (value: unknown): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
};

const adminSubmissionUpdateBodySchema = z
  .object({
    status: z.nativeEnum(RegistrationStatus).optional(),
    internalNote: z.preprocess(
      normalizeOptionalNote,
      z.string().nullable().optional(),
    ),
  })
  .refine(
    (value) => value.status !== undefined || value.internalNote !== undefined,
    {
      message: "At least one field must be provided",
      path: ["status"],
    },
  );

export {
  adminSubmissionListQuerySchema,
  adminSubmissionParamsSchema,
  adminSubmissionUpdateBodySchema,
};
