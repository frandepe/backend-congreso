import { PaymentPlanType, RegistrationOptionCode } from "@prisma/client";
import { z } from "zod";
import { normalizeDni } from "../utils/normalize-dni";

const parseOptionalDate = (value: unknown): Date | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return undefined;
  }

  return parsedDate;
};

const submissionBodySchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  dni: z
    .string()
    .trim()
    .min(1)
    .transform((value) => normalizeDni(value))
    .refine((value) => value.length > 0, {
      message: "Invalid dni",
    }),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(1),
  registrationOptionCode: z.nativeEnum(RegistrationOptionCode),
  paymentPlanType: z.nativeEnum(PaymentPlanType),
  installmentNumber: z.coerce.number().int().positive(),
  amountReported: z.coerce.number().positive(),
  paymentDate: z
    .preprocess(parseOptionalDate, z.date().optional()),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

const additionalReceiptBodySchema = z.object({
  installmentNumber: z.coerce.number().int().positive(),
  amountReported: z.coerce.number().positive(),
  paymentDate: z.preprocess(parseOptionalDate, z.date().optional()),
});

const submissionIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

const submissionStatusParamsSchema = z.object({
  id: z.string().trim().min(1),
});

const recoverTrackingCodeBodySchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
});

const pendingSecondInstallmentLookupBodySchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .transform((value) => value.toLowerCase())
      .optional(),
    dni: z
      .string()
      .trim()
      .transform((value) => normalizeDni(value))
      .optional(),
  })
  .refine((value) => Boolean(value.email || value.dni), {
    message: "Email o DNI requerido",
  });

export {
  additionalReceiptBodySchema,
  pendingSecondInstallmentLookupBodySchema,
  recoverTrackingCodeBodySchema,
  submissionBodySchema,
  submissionIdParamsSchema,
  submissionStatusParamsSchema,
};
