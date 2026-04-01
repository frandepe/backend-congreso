import {
  CommercialKind,
  CommercialOptionCode,
  PaymentPlanType,
} from "@prisma/client";
import { z } from "zod";

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

const commercialSubmissionBodySchema = z.object({
  companyName: z.string().trim().min(1),
  contactFirstName: z.string().trim().min(1),
  contactLastName: z.string().trim().min(1),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(1),
  websiteOrSocialUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  commercialKind: z.nativeEnum(CommercialKind),
  commercialOptionCode: z.nativeEnum(CommercialOptionCode),
  paymentPlanType: z.nativeEnum(PaymentPlanType),
  installmentNumber: z.coerce.number().int().positive(),
  includesEquipment: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (typeof value === "boolean") {
        return value;
      }

      return value === "true";
    }),
  amountReported: z.coerce.number().positive(),
  discountCouponCode: z
    .string()
    .trim()
    .min(1)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  paymentDate: z.preprocess(parseOptionalDate, z.date().optional()),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
}).superRefine((value, context) => {
  if (
    value.commercialKind === CommercialKind.ADVERTISING &&
    !value.websiteOrSocialUrl
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["websiteOrSocialUrl"],
      message: "Ingresa la web de la empresa o, si no tiene, Facebook o Instagram.",
    });
  }
});

const commercialRequestDiscountCouponBodySchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
});

const commercialValidateDiscountCouponBodySchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  couponCode: z.string().trim().min(1),
});

const commercialAdditionalReceiptBodySchema = z.object({
  installmentNumber: z.coerce.number().int().positive(),
  amountReported: z.coerce.number().positive(),
  paymentDate: z.preprocess(parseOptionalDate, z.date().optional()),
});

const commercialTrackingCodeRecoveryBodySchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
});

export {
  commercialAdditionalReceiptBodySchema,
  commercialRequestDiscountCouponBodySchema,
  commercialSubmissionBodySchema,
  commercialTrackingCodeRecoveryBodySchema,
  commercialValidateDiscountCouponBodySchema,
};
