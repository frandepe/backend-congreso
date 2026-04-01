import { PaymentReceiptStatus, Prisma, RegistrationStatus } from "@prisma/client";
import {
  toPublicAdditionalReceiptCreatedDto,
  toPublicDiscountCouponRequestResponseDto,
  toPublicDiscountCouponValidationResponseDto,
  toPublicPricingCatalogDto,
  toPublicSubmissionCreatedDto,
  toPublicSubmissionStatusDto,
} from "../mappers/submission.mapper";
import { prisma } from "../lib/prisma";
import {
  destroyUploadedReceipt,
  uploadReceiptBuffer,
} from "./receipt-upload.service";
import {
  hasEmailTransportConfigured,
  sendInitialSubmissionConfirmationEmail,
  sendTrackingCodeRecoveryEmail,
} from "./email.service";
import {
  requestDiscountCoupon,
  resolveCouponForSubmission,
  validateDiscountCoupon,
} from "./discount-coupon.service";
import {
  assertPaymentPlanAllowedForOption,
  buildPricingSummary,
  DEFAULT_DISCOUNT_PERCENTAGE,
  getInstallmentCountExpected,
  getAllowedPaymentPlanTypes,
  getPaymentPlanDefinition,
  getRegistrationOption,
  INSTALLMENTS_AVAILABLE_UNTIL,
  INSTALLMENTS_TIMEZONE,
  isInstallmentsAvailable,
} from "../config/registration-options";
import { HttpError } from "../utils/http-error";
import type {
  CreateAdditionalReceiptInput,
  CreateAdditionalReceiptResult,
  CreateInitialSubmissionInput,
  CreateInitialSubmissionResult,
  FindPendingSecondInstallmentInput,
  FindPendingSecondInstallmentResult,
  PublicPricingCatalogResult,
  PublicSubmissionStatusResult,
  RequestDiscountCouponInput,
  RequestDiscountCouponResult,
  RecoverTrackingCodeInput,
  RecoverTrackingCodeResult,
  ValidateDiscountCouponInput,
  ValidateDiscountCouponResult,
} from "../types/submission.types";
import {
  formatTrackingCode,
  normalizeTrackingCode,
} from "../utils/tracking-code";

const nowMs = () => performance.now();
const SECOND_INSTALLMENT_CONTACT_EMAIL = "congresonacionalrcp@gmail.com";
const SECOND_INSTALLMENT_CONTACT_WHATSAPP = "2392-460227";

const getSecondInstallmentExpiredMessage = () =>
  `Se venció el plazo para informar la segunda cuota. Comunicate a ${SECOND_INSTALLMENT_CONTACT_EMAIL} o por WhatsApp al ${SECOND_INSTALLMENT_CONTACT_WHATSAPP}.`;

const getElapsedMs = (startedAt: number) =>
  Number((nowMs() - startedAt).toFixed(1));

const resolveSecondInstallmentDueAt = (input: {
  createdAt: Date;
  secondInstallmentDueAt?: Date | null;
  paymentPlanType: "ONE_PAYMENT" | "TWO_INSTALLMENTS";
}) => {
  if (input.paymentPlanType !== "TWO_INSTALLMENTS") {
    return null;
  }

  if (input.secondInstallmentDueAt) {
    return input.secondInstallmentDueAt;
  }

  const fallbackDueAt = new Date(input.createdAt);
  fallbackDueAt.setDate(fallbackDueAt.getDate() + 30);

  return fallbackDueAt;
};

const isSecondInstallmentExpired = (dueAt: Date | null, now: Date = new Date()) => {
  if (!dueAt) {
    return false;
  }

  return now.getTime() > dueAt.getTime();
};

const logInitialSubmissionTiming = (data: {
  registrationOptionCode: string;
  paymentPlanType: string;
  receiptSizeBytes: number;
  uploadMs: number;
  registrationInsertMs: number;
  receiptInsertMs: number;
  transactionMs: number;
  totalMs: number;
  trackingCode: string;
}) => {
  console.info(
    `[submissions.createInitial] trackingCode=${data.trackingCode} option=${data.registrationOptionCode} plan=${data.paymentPlanType} receiptSizeBytes=${data.receiptSizeBytes} uploadMs=${data.uploadMs} registrationInsertMs=${data.registrationInsertMs} receiptInsertMs=${data.receiptInsertMs} transactionMs=${data.transactionMs} totalMs=${data.totalMs}`,
  );
};

const dispatchInitialSubmissionConfirmationEmail = (input: {
  to: string;
  trackingCode: string;
  registrationOptionLabel: string;
  paymentPlanLabel: string;
  totalAmountExpected: number;
  installmentAmountExpected: number | null;
  discountAppliedPercentage: number | null;
  discountAppliedAmount: number | null;
  secondInstallmentDueAt: Date | null;
}) => {
  setImmediate(async () => {
    const emailStartedAt = nowMs();

    try {
      await sendInitialSubmissionConfirmationEmail(input);
      console.info(
        `[submissions.createInitial.email] status=sent trackingCode=${input.trackingCode} emailMs=${getElapsedMs(
          emailStartedAt,
        )}`,
      );
    } catch (error) {
      console.error(
        `[submissions.createInitial.email] status=failed trackingCode=${input.trackingCode} emailMs=${getElapsedMs(
          emailStartedAt,
        )}`,
        error,
      );
    }
  });
};

const createInitialSubmission = async (
  input: CreateInitialSubmissionInput,
  file: Express.Multer.File,
): Promise<CreateInitialSubmissionResult> => {
  const requestStartedAt = nowMs();

  if (input.installmentNumber !== 1) {
    throw new HttpError(
      400,
      "INVALID_INSTALLMENT_NUMBER",
      "Initial submission must use installment number 1",
    );
  }

  const registrationReferenceDate = new Date();
  assertPaymentPlanAllowedForOption(
    input.registrationOptionCode,
    input.paymentPlanType,
    registrationReferenceDate,
  );
  const registrationOption = getRegistrationOption(input.registrationOptionCode);

  const uploadStartedAt = nowMs();
  const uploadedReceipt = await uploadReceiptBuffer(file);
  const uploadMs = getElapsedMs(uploadStartedAt);

  try {
    const transactionStartedAt = nowMs();
    const result = await prisma.$transaction(async (tx) => {
      const resolvedCoupon = await resolveCouponForSubmission({
        tx,
        email: input.email,
        couponCode: input.discountCouponCode,
      });
      const discountPercentage = resolvedCoupon?.discountPercentage ?? 0;
      const pricingSummary = buildPricingSummary({
        registrationOptionCode: input.registrationOptionCode,
        paymentPlanType: input.paymentPlanType,
        discountPercentage,
        referenceDate: registrationReferenceDate,
      });

      if (input.amountReported !== pricingSummary.installmentAmount) {
        throw new HttpError(
          400,
          "INVALID_AMOUNT_REPORTED",
          "Invalid reported amount",
        );
      }

      const registrationInsertStartedAt = nowMs();
      const registrationSubmission = await tx.registrationSubmission.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          dni: input.dni,
          email: input.email,
          phone: input.phone,
          registrationOptionCode: input.registrationOptionCode,
          registrationOptionLabelSnapshot: registrationOption.label,
          currencyCode: "ARS",
          baseAmountExpected: pricingSummary.registrationOption.totalAmountExpected,
          discountAppliedPercentage:
            discountPercentage > 0 ? discountPercentage : null,
          discountAppliedAmount:
            discountPercentage > 0 ? pricingSummary.discountAppliedAmount : null,
          discountEligibleEmailNormalized:
            resolvedCoupon?.emailNormalized ?? null,
          totalAmountExpected: pricingSummary.finalTotalAmount,
          installmentsAllowed: pricingSummary.installmentsAllowed,
          paymentPlanType: input.paymentPlanType,
          installmentCountExpected: pricingSummary.installmentCountExpected,
          installmentAmountExpected: pricingSummary.installmentAmount,
          secondInstallmentDueAt: pricingSummary.secondInstallmentDueAt,
          status: RegistrationStatus.PENDING_REVIEW,
          notes: input.notes,
        },
      });
      const registrationInsertMs = getElapsedMs(registrationInsertStartedAt);

      const receiptInsertStartedAt = nowMs();
      await tx.paymentReceiptSubmission.create({
        data: {
          registrationSubmissionId: registrationSubmission.id,
          installmentNumber: input.installmentNumber,
          amountReported: input.amountReported,
          paymentDate: input.paymentDate,
          receiptUrl: uploadedReceipt.secureUrl,
          receiptPublicId: uploadedReceipt.publicId,
          receiptOriginalFilename: uploadedReceipt.originalFilename,
          receiptMimeType: uploadedReceipt.mimeType,
          receiptSizeBytes: uploadedReceipt.bytes,
          status: PaymentReceiptStatus.PENDING_REVIEW,
        },
      });
      const receiptInsertMs = getElapsedMs(receiptInsertStartedAt);

      if (resolvedCoupon) {
        await (tx as any).discountCoupon.update({
          where: {
            id: resolvedCoupon.id,
          },
          data: {
            status: "USED",
            usedAt: new Date(),
            usedBySubmissionId: registrationSubmission.id,
          },
        });
      }

      return {
        registrationSubmission,
        registrationInsertMs,
        receiptInsertMs,
      };
    });
    const transactionMs = getElapsedMs(transactionStartedAt);

    const trackingCode = formatTrackingCode(result.registrationSubmission.id);
    const createdSubmissionSecondInstallmentDueAt = (
      result.registrationSubmission as any
    ).secondInstallmentDueAt as Date | null | undefined;
    const paymentPlanLabel =
      input.paymentPlanType === "TWO_INSTALLMENTS" ? "2 cuotas" : "1 pago";

    logInitialSubmissionTiming({
      trackingCode,
      registrationOptionCode: input.registrationOptionCode,
      paymentPlanType: input.paymentPlanType,
      receiptSizeBytes: file.size,
      uploadMs,
      registrationInsertMs: result.registrationInsertMs,
      receiptInsertMs: result.receiptInsertMs,
      transactionMs,
      totalMs: getElapsedMs(requestStartedAt),
    });

    if (hasEmailTransportConfigured()) {
      dispatchInitialSubmissionConfirmationEmail({
        to: input.email,
        trackingCode,
        registrationOptionLabel: registrationOption.label,
        paymentPlanLabel,
        totalAmountExpected: Number(result.registrationSubmission.totalAmountExpected),
        installmentAmountExpected:
          result.registrationSubmission.installmentAmountExpected !== null
            ? Number(result.registrationSubmission.installmentAmountExpected)
            : null,
        discountAppliedPercentage:
          result.registrationSubmission.discountAppliedPercentage ?? null,
        discountAppliedAmount:
          result.registrationSubmission.discountAppliedAmount !== null
            ? Number(result.registrationSubmission.discountAppliedAmount)
            : null,
        secondInstallmentDueAt:
          createdSubmissionSecondInstallmentDueAt ?? null,
      });
    }

    return toPublicSubmissionCreatedDto({
      registrationId: result.registrationSubmission.id,
      trackingCode,
      status: result.registrationSubmission.status,
      registrationOption: {
        code: input.registrationOptionCode,
        label: registrationOption.label,
        totalAmountExpected: Number(result.registrationSubmission.totalAmountExpected),
      },
      paymentPlanType: result.registrationSubmission.paymentPlanType,
      installmentCountExpected: result.registrationSubmission.installmentCountExpected,
      installmentAmountExpected:
        result.registrationSubmission.installmentAmountExpected !== null
          ? Number(result.registrationSubmission.installmentAmountExpected)
          : null,
      secondInstallmentDueAt:
        createdSubmissionSecondInstallmentDueAt ?? null,
      receipt: {
        installmentNumber: input.installmentNumber,
        status: PaymentReceiptStatus.PENDING_REVIEW,
      },
      createdAt: result.registrationSubmission.createdAt,
      message: "Se ha recibido la inscripción y está pendiente de revisión",
    });
  } catch (error) {
    await destroyUploadedReceipt(
      uploadedReceipt.publicId,
      uploadedReceipt.resourceType,
    );
    throw error;
  }
};

const createAdditionalReceipt = async (
  input: CreateAdditionalReceiptInput,
  file: Express.Multer.File,
): Promise<CreateAdditionalReceiptResult> => {
  const existingSubmission = await prisma.registrationSubmission.findUnique({
    where: {
      id: normalizeTrackingCode(input.registrationId),
    },
    include: {
      paymentReceipts: true,
    },
  });

  if (!existingSubmission) {
    throw new HttpError(
      404,
      "SUBMISSION_NOT_FOUND",
      "No se ha encontrado la entrada",
    );
  }

  if (existingSubmission.paymentPlanType !== "TWO_INSTALLMENTS") {
    throw new HttpError(
      400,
      "PAYMENT_PLAN_DOES_NOT_ALLOW_ADDITIONAL_RECEIPTS",
      "Este envío no permite añadir un recibo adicional",
    );
  }

  if (input.installmentNumber === 1) {
    throw new HttpError(
      400,
      "INVALID_INSTALLMENT_NUMBER",
      "El recibo adicional debe llevar el número de plazo 2",
    );
  }

  if (input.installmentNumber > existingSubmission.installmentCountExpected) {
    throw new HttpError(
      400,
      "INVALID_INSTALLMENT_NUMBER",
      "El número de cuotas supera el número de cuotas previsto",
    );
  }

  const existingReceipt = existingSubmission.paymentReceipts.find(
    (receipt) => receipt.installmentNumber === input.installmentNumber,
  );

  if (existingReceipt) {
    throw new HttpError(
      409,
      "INSTALLMENT_ALREADY_SUBMITTED",
      "Este plazo ya ha sido enviado",
    );
  }

  const existingSubmissionInstallmentAmount = (existingSubmission as any)
    .installmentAmountExpected as Prisma.Decimal | null | undefined;
  const existingSubmissionSecondInstallmentDueAt = (existingSubmission as any)
    .secondInstallmentDueAt as Date | null | undefined;
  const resolvedSecondInstallmentDueAt = resolveSecondInstallmentDueAt({
    createdAt: existingSubmission.createdAt,
    secondInstallmentDueAt: existingSubmissionSecondInstallmentDueAt ?? null,
    paymentPlanType: existingSubmission.paymentPlanType,
  });
  const secondInstallmentExpired = isSecondInstallmentExpired(
    resolvedSecondInstallmentDueAt,
  );
  const expectedInstallmentAmount =
    existingSubmissionInstallmentAmount != null
      ? Number(existingSubmissionInstallmentAmount)
      : Number(existingSubmission.totalAmountExpected);

  if (secondInstallmentExpired) {
    throw new HttpError(
      409,
      "SECOND_INSTALLMENT_EXPIRED",
      getSecondInstallmentExpiredMessage(),
      {
        secondInstallmentDueAt: resolvedSecondInstallmentDueAt,
      },
    );
  }

  if (input.amountReported !== expectedInstallmentAmount) {
    throw new HttpError(
      400,
      "INVALID_AMOUNT_REPORTED",
      "Invalid reported amount",
    );
  }

  const uploadedReceipt = await uploadReceiptBuffer(file);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const paymentReceipt = await tx.paymentReceiptSubmission.create({
        data: {
          registrationSubmissionId: existingSubmission.id,
          installmentNumber: input.installmentNumber,
          amountReported: input.amountReported,
          paymentDate: input.paymentDate,
          receiptUrl: uploadedReceipt.secureUrl,
          receiptPublicId: uploadedReceipt.publicId,
          receiptOriginalFilename: uploadedReceipt.originalFilename,
          receiptMimeType: uploadedReceipt.mimeType,
          receiptSizeBytes: uploadedReceipt.bytes,
          status: PaymentReceiptStatus.PENDING_REVIEW,
        },
      });

      const registrationSubmission = await tx.registrationSubmission.update({
        where: {
          id: existingSubmission.id,
        },
        data: {
          status: RegistrationStatus.PENDING_REVIEW,
        },
      });

      return {
        paymentReceipt,
        registrationSubmission,
      };
    });

    return toPublicAdditionalReceiptCreatedDto({
      registrationId: result.registrationSubmission.id,
      trackingCode: formatTrackingCode(result.registrationSubmission.id),
      status: result.registrationSubmission.status,
      paymentPlanType: existingSubmission.paymentPlanType,
      installmentCountExpected: existingSubmission.installmentCountExpected,
      installmentAmountExpected:
        existingSubmissionInstallmentAmount != null
          ? Number(existingSubmissionInstallmentAmount)
          : null,
      secondInstallmentDueAt:
        resolvedSecondInstallmentDueAt,
      secondInstallmentExpired,
      receipt: {
        installmentNumber: result.paymentReceipt.installmentNumber,
        status: result.paymentReceipt.status,
      },
      createdAt: result.paymentReceipt.createdAt,
      message: "Su recibo ha sido recibido y está pendiente de revisión",
    });
  } catch (error) {
    await destroyUploadedReceipt(
      uploadedReceipt.publicId,
      uploadedReceipt.resourceType,
    );
    throw error;
  }
};

const getPublicSubmissionStatus = async (
  trackingCodeOrId: string,
): Promise<PublicSubmissionStatusResult> => {
  const registrationId = normalizeTrackingCode(trackingCodeOrId);

  if (!registrationId) {
    throw new HttpError(
      400,
      "INVALID_TRACKING_CODE",
      "Tracking code is required",
    );
  }

  const submission = await prisma.registrationSubmission.findUnique({
    where: {
      id: registrationId,
    },
    include: {
      paymentReceipts: {
        orderBy: {
          installmentNumber: "asc",
        },
      },
    },
  });

  if (!submission) {
    throw new HttpError(
      404,
      "SUBMISSION_NOT_FOUND",
      "No se ha encontrado la entrada",
    );
  }

  const approvedReceiptsCount = submission.paymentReceipts.filter(
    (receipt) => receipt.status === PaymentReceiptStatus.APPROVED,
  ).length;
  const pendingReceiptsCount = submission.paymentReceipts.filter(
    (receipt) => receipt.status === PaymentReceiptStatus.PENDING_REVIEW,
  ).length;
  const submissionSecondInstallmentDueAt = (submission as any)
    .secondInstallmentDueAt as Date | null | undefined;
  const resolvedSecondInstallmentDueAt = resolveSecondInstallmentDueAt({
    createdAt: submission.createdAt,
    secondInstallmentDueAt: submissionSecondInstallmentDueAt ?? null,
    paymentPlanType: submission.paymentPlanType,
  });
  const secondInstallmentExpired = isSecondInstallmentExpired(
    resolvedSecondInstallmentDueAt,
  );
  const secondInstallmentUploadAllowed =
    submission.paymentPlanType === "TWO_INSTALLMENTS" &&
    submission.paymentReceipts.length < submission.installmentCountExpected &&
    !secondInstallmentExpired;

  return toPublicSubmissionStatusDto({
    registrationId: submission.id,
    trackingCode: formatTrackingCode(submission.id),
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
    status: submission.status,
    registrationOption: {
      code: submission.registrationOptionCode,
      label: submission.registrationOptionLabelSnapshot,
      totalAmountExpected: Number(submission.totalAmountExpected),
    },
    paymentPlanType: submission.paymentPlanType,
    installmentCountExpected: submission.installmentCountExpected,
    installmentAmountExpected:
      submission.installmentAmountExpected !== null
        ? Number(submission.installmentAmountExpected)
        : null,
    secondInstallmentDueAt: resolvedSecondInstallmentDueAt,
    secondInstallmentExpired,
    secondInstallmentUploadAllowed,
    submittedReceiptsCount: submission.paymentReceipts.length,
    approvedReceiptsCount,
    pendingReceiptsCount,
    receipts: submission.paymentReceipts.map((receipt) => ({
      installmentNumber: receipt.installmentNumber,
      status: receipt.status,
      createdAt: receipt.createdAt,
    })),
  });
};

const recoverTrackingCode = async ({
  email,
}: RecoverTrackingCodeInput): Promise<RecoverTrackingCodeResult> => {
  const submissions = await prisma.registrationSubmission.findMany({
    where: {
      email,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const recoverableTrackingCodes = submissions.map((submission) =>
    formatTrackingCode(submission.id),
  );

  if (recoverableTrackingCodes.length > 0) {
    if (!hasEmailTransportConfigured()) {
      throw new Error("Email transport is not configured");
    }

    await sendTrackingCodeRecoveryEmail({
      to: email,
      trackingCodes: recoverableTrackingCodes,
    });
  }

  return {
    found: recoverableTrackingCodes.length > 0,
    message:
      recoverableTrackingCodes.length > 0
        ? "Encontramos una inscripcion asociada a ese email y enviamos el codigo por correo."
        : "No encontramos una inscripcion asociada a ese email.",
  };
};

const findPendingSecondInstallment = async ({
  email,
  dni,
}: FindPendingSecondInstallmentInput): Promise<FindPendingSecondInstallmentResult> => {
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedDni = dni?.trim();

  if (!normalizedEmail && !normalizedDni) {
    return {
      found: false,
      trackingCode: null,
      participantName: null,
      secondInstallmentDueAt: null,
      secondInstallmentExpired: false,
      secondInstallmentUploadAllowed: false,
      message: "Sin datos suficientes para verificar una segunda cuota.",
    };
  }

  const submissions = await prisma.registrationSubmission.findMany({
    where: {
      paymentPlanType: "TWO_INSTALLMENTS",
      OR: [
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ...(normalizedDni ? [{ dni: normalizedDni }] : []),
      ],
    },
    include: {
      paymentReceipts: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const matchedSubmission = submissions.find(
    (submission) =>
      submission.paymentReceipts.length < submission.installmentCountExpected,
  );

  if (!matchedSubmission) {
    return {
      found: false,
      trackingCode: null,
      participantName: null,
      secondInstallmentDueAt: null,
      secondInstallmentExpired: false,
      secondInstallmentUploadAllowed: false,
      message: "No encontramos una segunda cuota pendiente para esos datos.",
    };
  }

  const matchedSubmissionSecondInstallmentDueAt = (matchedSubmission as any)
    .secondInstallmentDueAt as Date | null | undefined;
  const resolvedSecondInstallmentDueAt = resolveSecondInstallmentDueAt({
    createdAt: matchedSubmission.createdAt,
    secondInstallmentDueAt: matchedSubmissionSecondInstallmentDueAt ?? null,
    paymentPlanType: matchedSubmission.paymentPlanType,
  });
  const secondInstallmentExpired = isSecondInstallmentExpired(
    resolvedSecondInstallmentDueAt,
  );
  const secondInstallmentUploadAllowed = !secondInstallmentExpired;

  return {
    found: true,
    trackingCode: formatTrackingCode(matchedSubmission.id),
    participantName: `${matchedSubmission.firstName} ${matchedSubmission.lastName}`,
    secondInstallmentDueAt: resolvedSecondInstallmentDueAt,
    secondInstallmentExpired,
    secondInstallmentUploadAllowed,
    message: secondInstallmentExpired
      ? getSecondInstallmentExpiredMessage()
      : "Encontramos una inscripcion previa en 2 cuotas con segunda cuota pendiente.",
  };
};

const getPublicPricingCatalog = async (): Promise<PublicPricingCatalogResult> => {
  const referenceDate = new Date();

  return toPublicPricingCatalogDto({
    discountPercentage: DEFAULT_DISCOUNT_PERCENTAGE,
    installmentsAvailable: isInstallmentsAvailable(referenceDate),
    installmentsAvailableUntil: INSTALLMENTS_AVAILABLE_UNTIL,
    installmentsTimezone: INSTALLMENTS_TIMEZONE,
    options: (
      [
        "ONE_DAY",
        "THREE_DAYS",
        "THREE_DAYS_WITH_LODGING",
      ] as const
    ).map((registrationOptionCode) => {
      const registrationOption = getRegistrationOption(registrationOptionCode);

      return {
        code: registrationOption.code,
        label: registrationOption.label,
        baseTotalAmount: registrationOption.totalAmountExpected,
        discountedTotalAmount: buildPricingSummary({
          registrationOptionCode,
          paymentPlanType: "ONE_PAYMENT",
          discountPercentage: DEFAULT_DISCOUNT_PERCENTAGE,
          referenceDate,
        }).finalTotalAmount,
        paymentPlans: getAllowedPaymentPlanTypes(
          registrationOptionCode,
          referenceDate,
        ).map(
          (paymentPlanType) => {
            const basePricing = buildPricingSummary({
              registrationOptionCode,
              paymentPlanType,
              referenceDate,
            });
            const discountedPricing = buildPricingSummary({
              registrationOptionCode,
              paymentPlanType,
              discountPercentage: DEFAULT_DISCOUNT_PERCENTAGE,
              referenceDate,
            });

            return {
              type: paymentPlanType,
              label: getPaymentPlanDefinition(paymentPlanType).label,
              installmentCount: getInstallmentCountExpected(paymentPlanType),
              baseInstallmentAmount: basePricing.installmentAmount,
              discountedInstallmentAmount:
                discountedPricing.installmentAmount,
            };
          },
        ),
      };
    }),
  });
};

const requestPublicDiscountCoupon = async ({
  email,
}: RequestDiscountCouponInput): Promise<RequestDiscountCouponResult> => {
  const result = await requestDiscountCoupon({ email });
  return toPublicDiscountCouponRequestResponseDto(result);
};

const validatePublicDiscountCoupon = async ({
  email,
  couponCode,
}: ValidateDiscountCouponInput): Promise<ValidateDiscountCouponResult> => {
  const result = await validateDiscountCoupon({
    email,
    couponCode,
  });
  return toPublicDiscountCouponValidationResponseDto(result);
};

export {
  createAdditionalReceipt,
  createInitialSubmission,
  findPendingSecondInstallment,
  getPublicPricingCatalog,
  getPublicSubmissionStatus,
  requestPublicDiscountCoupon,
  recoverTrackingCode,
  validatePublicDiscountCoupon,
};
