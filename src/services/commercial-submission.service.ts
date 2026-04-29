import { PaymentReceiptStatus, RegistrationStatus } from "@prisma/client";
import {
  toCommercialAdditionalReceiptCreatedDto,
  toCommercialDiscountCouponRequestResponseDto,
  toCommercialDiscountCouponValidationResponseDto,
  toCommercialPricingCatalogDto,
  toCommercialSubmissionCreatedDto,
  toCommercialTrackingCodeRecoveryResponseDto,
  toPublicCommercialSubmissionStatusDto,
} from "../mappers/submission.mapper";
import { prisma } from "../lib/prisma";
import {
  assertCommercialPaymentPlanAllowed,
  buildCommercialPricingSummary,
  getCommercialPricingCatalog as getCommercialPricingCatalogConfig,
} from "../config/commercial-options";
import {
  destroyUploadedReceipt,
  uploadReceiptBuffer,
} from "./receipt-upload.service";
import {
  hasEmailTransportConfigured,
  sendCommercialSubmissionConfirmationEmail,
  sendCommercialTrackingCodeRecoveryEmail,
} from "./email.service";
import {
  requestCommercialStandDiscountCoupon as requestCommercialStandDiscountCouponService,
  resolveCommercialStandCouponForSubmission,
  validateCommercialStandDiscountCoupon as validateCommercialStandDiscountCouponService,
} from "./commercial-discount-coupon.service";
import { HttpError } from "../utils/http-error";
import type {
  CommercialPricingCatalogResult,
  CommercialSubmissionStatusResult,
  CreateCommercialAdditionalReceiptInput,
  CreateCommercialAdditionalReceiptResult,
  CreateCommercialSubmissionInput,
  CreateCommercialSubmissionResult,
  RecoverCommercialTrackingCodeInput,
  RecoverCommercialTrackingCodeResult,
  RequestCommercialStandDiscountCouponInput,
  RequestCommercialStandDiscountCouponResult,
  ValidateCommercialStandDiscountCouponInput,
  ValidateCommercialStandDiscountCouponResult,
} from "../types/commercial-submission.types";
import {
  formatCommercialTrackingCode,
  normalizeCommercialTrackingCode,
} from "../utils/commercial-tracking-code";

const nowMs = () => performance.now();

const getElapsedMs = (startedAt: number) =>
  Number((nowMs() - startedAt).toFixed(1));

const getCommercialSecondInstallmentExpiredMessage = () =>
  "Se vencio el plazo para informar la segunda cuota de la solicitud comercial. Comunicate con el comite organizador.";

const resolveCommercialSecondInstallmentDueAt = (input: {
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

const isCommercialSecondInstallmentExpired = (
  dueAt: Date | null,
  now: Date = new Date(),
) => {
  if (!dueAt) {
    return false;
  }

  return now.getTime() > dueAt.getTime();
};

const logCommercialSubmissionTiming = (data: {
  commercialKind: string;
  commercialOptionCode: string;
  paymentPlanType: string;
  receiptSizeBytes: number;
  uploadMs: number;
  submissionInsertMs: number;
  receiptInsertMs: number;
  transactionMs: number;
  totalMs: number;
  trackingCode: string;
}) => {
  console.info(
    `[commercial-submissions.create] trackingCode=${data.trackingCode} kind=${data.commercialKind} option=${data.commercialOptionCode} plan=${data.paymentPlanType} receiptSizeBytes=${data.receiptSizeBytes} uploadMs=${data.uploadMs} submissionInsertMs=${data.submissionInsertMs} receiptInsertMs=${data.receiptInsertMs} transactionMs=${data.transactionMs} totalMs=${data.totalMs}`,
  );
};

const dispatchCommercialSubmissionConfirmationEmail = (input: {
  to: string;
  trackingCode: string;
  commercialKindLabel: string;
  commercialOptionLabel: string;
  companyName: string;
  paymentPlanLabel: string;
  totalAmountExpected: number;
  installmentAmountExpected: number | null;
  discountAppliedAmount: number | null;
  secondInstallmentDueAt: Date | null;
}) => {
  setImmediate(async () => {
    const emailStartedAt = nowMs();

    try {
      await sendCommercialSubmissionConfirmationEmail(input);
      console.info(
        `[commercial-submissions.create.email] status=sent trackingCode=${input.trackingCode} emailMs=${getElapsedMs(
          emailStartedAt,
        )}`,
      );
    } catch (error) {
      console.error(
        `[commercial-submissions.create.email] status=failed trackingCode=${input.trackingCode} emailMs=${getElapsedMs(
          emailStartedAt,
        )}`,
        error,
      );
    }
  });
};

const getCommercialKindLabel = (
  commercialKind: CreateCommercialSubmissionInput["commercialKind"],
) => {
  return commercialKind === "STAND" ? "Stand" : "Publicidad";
};

const getCommercialPaymentPlanLabel = (
  paymentPlanType: CreateCommercialSubmissionInput["paymentPlanType"],
) => {
  return paymentPlanType === "TWO_INSTALLMENTS" ? "2 cuotas" : "1 pago";
};

const createCommercialSubmission = async (
  input: CreateCommercialSubmissionInput,
  file: Express.Multer.File,
): Promise<CreateCommercialSubmissionResult> => {
  const requestStartedAt = nowMs();

  if (input.installmentNumber !== 1) {
    throw new HttpError(
      400,
      "INVALID_INSTALLMENT_NUMBER",
      "Initial commercial submission must use installment number 1",
    );
  }

  assertCommercialPaymentPlanAllowed(
    input.commercialKind,
    input.paymentPlanType,
  );

  const uploadStartedAt = nowMs();
  const uploadedReceipt = await uploadReceiptBuffer(file);
  const uploadMs = getElapsedMs(uploadStartedAt);

  try {
    const transactionStartedAt = nowMs();
    const result = await prisma.$transaction(async (tx) => {
      const resolvedCoupon =
        input.commercialKind === "STAND"
          ? await resolveCommercialStandCouponForSubmission({
              tx,
              email: input.email,
              couponCode: input.discountCouponCode,
            })
          : null;

      if (input.commercialKind !== "STAND" && input.discountCouponCode) {
        throw new HttpError(
          400,
          "COMMERCIAL_DISCOUNT_NOT_ALLOWED",
          "Solo los stands admiten cupon de descuento",
        );
      }

      const pricingSummary = buildCommercialPricingSummary({
        commercialKind: input.commercialKind,
        commercialOptionCode: input.commercialOptionCode,
        paymentPlanType: input.paymentPlanType,
        applyStandDiscount: Boolean(resolvedCoupon),
      });

      if (input.amountReported !== pricingSummary.installmentAmount) {
        throw new HttpError(
          400,
          "INVALID_AMOUNT_REPORTED",
          "Invalid reported amount",
        );
      }

      const submissionInsertStartedAt = nowMs();
        const commercialSubmission = await tx.commercialSubmission.create({
          data: {
            companyName: input.companyName,
            contactFirstName: input.contactFirstName,
            contactLastName: input.contactLastName,
            email: input.email,
            phone: input.phone,
            websiteOrSocialUrl: input.websiteOrSocialUrl,
            commercialKind: input.commercialKind,
            commercialOptionCode: input.commercialOptionCode,
          commercialOptionLabelSnapshot: pricingSummary.option.label,
          currencyCode: "ARS",
          baseAmountExpected: pricingSummary.baseAmount,
          equipmentAdditionalAmount: null,
          discountAppliedAmount:
            pricingSummary.discountAppliedAmount > 0
              ? pricingSummary.discountAppliedAmount
              : null,
          discountEligibleEmailNormalized:
            resolvedCoupon?.emailNormalized ?? null,
          totalAmountExpected: pricingSummary.totalAmount,
          paymentPlanType: input.paymentPlanType,
          installmentCountExpected: pricingSummary.installmentCountExpected,
          installmentAmountExpected: pricingSummary.installmentAmount,
          secondInstallmentDueAt: pricingSummary.secondInstallmentDueAt,
          includesEquipment: false,
          status: RegistrationStatus.PENDING_REVIEW,
          notes: input.notes,
        },
      });
      const submissionInsertMs = getElapsedMs(submissionInsertStartedAt);

      const receiptInsertStartedAt = nowMs();
      await tx.commercialPaymentReceipt.create({
        data: {
          commercialSubmissionId: commercialSubmission.id,
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
        await (tx as any).commercialDiscountCoupon.update({
          where: {
            id: resolvedCoupon.id,
          },
          data: {
            status: "USED",
            usedAt: new Date(),
            usedByCommercialSubmissionId: commercialSubmission.id,
          },
        });
      }

      return {
        commercialSubmission,
        submissionInsertMs,
        receiptInsertMs,
      };
    });
    const transactionMs = getElapsedMs(transactionStartedAt);

    const trackingCode = formatCommercialTrackingCode(
      result.commercialSubmission.id,
    );

    logCommercialSubmissionTiming({
      trackingCode,
      commercialKind: input.commercialKind,
      commercialOptionCode: input.commercialOptionCode,
      paymentPlanType: input.paymentPlanType,
      receiptSizeBytes: file.size,
      uploadMs,
      submissionInsertMs: result.submissionInsertMs,
      receiptInsertMs: result.receiptInsertMs,
      transactionMs,
      totalMs: getElapsedMs(requestStartedAt),
    });

    if (hasEmailTransportConfigured()) {
      dispatchCommercialSubmissionConfirmationEmail({
        to: input.email,
        trackingCode,
        commercialKindLabel: getCommercialKindLabel(input.commercialKind),
        commercialOptionLabel:
          result.commercialSubmission.commercialOptionLabelSnapshot,
        companyName: result.commercialSubmission.companyName,
        paymentPlanLabel: getCommercialPaymentPlanLabel(input.paymentPlanType),
        totalAmountExpected: Number(result.commercialSubmission.totalAmountExpected),
        installmentAmountExpected:
          result.commercialSubmission.installmentAmountExpected !== null
            ? Number(result.commercialSubmission.installmentAmountExpected)
            : null,
        discountAppliedAmount:
          result.commercialSubmission.discountAppliedAmount !== null
            ? Number(result.commercialSubmission.discountAppliedAmount)
            : null,
        secondInstallmentDueAt: result.commercialSubmission.secondInstallmentDueAt,
      });
    }

    return toCommercialSubmissionCreatedDto({
      submissionId: result.commercialSubmission.id,
      trackingCode,
      status: result.commercialSubmission.status,
      commercial: {
        kind: result.commercialSubmission.commercialKind,
        optionCode: result.commercialSubmission.commercialOptionCode,
        label: result.commercialSubmission.commercialOptionLabelSnapshot,
        companyName: result.commercialSubmission.companyName,
        baseAmountExpected: Number(result.commercialSubmission.baseAmountExpected),
        discountAppliedAmount:
          result.commercialSubmission.discountAppliedAmount !== null
            ? Number(result.commercialSubmission.discountAppliedAmount)
            : null,
        totalAmountExpected: Number(result.commercialSubmission.totalAmountExpected),
      },
      paymentPlanType: result.commercialSubmission.paymentPlanType,
      installmentCountExpected: result.commercialSubmission.installmentCountExpected,
      installmentAmountExpected:
        result.commercialSubmission.installmentAmountExpected !== null
          ? Number(result.commercialSubmission.installmentAmountExpected)
          : null,
      secondInstallmentDueAt: result.commercialSubmission.secondInstallmentDueAt,
      receipt: {
        installmentNumber: 1,
        status: PaymentReceiptStatus.PENDING_REVIEW,
      },
      createdAt: result.commercialSubmission.createdAt,
      message: "Se recibio la solicitud comercial y esta pendiente de revision",
    });
  } catch (error) {
    await destroyUploadedReceipt(
      uploadedReceipt.publicId,
      uploadedReceipt.resourceType,
    );
    throw error;
  }
};

const createCommercialAdditionalReceipt = async (
  commercialSubmissionId: string,
  input: CreateCommercialAdditionalReceiptInput,
  file: Express.Multer.File,
): Promise<CreateCommercialAdditionalReceiptResult> => {
  const normalizedId = normalizeCommercialTrackingCode(commercialSubmissionId);
  const existingSubmission = await prisma.commercialSubmission.findUnique({
    where: {
      id: normalizedId,
    },
    include: {
      paymentReceipts: {
        orderBy: {
          installmentNumber: "asc",
        },
      },
    },
  });

  if (!existingSubmission) {
    throw new HttpError(
      404,
      "COMMERCIAL_SUBMISSION_NOT_FOUND",
      "No encontramos la solicitud comercial",
    );
  }

  if (existingSubmission.paymentPlanType !== "TWO_INSTALLMENTS") {
    throw new HttpError(
      400,
      "COMMERCIAL_SECOND_INSTALLMENT_NOT_ALLOWED",
      "Esta solicitud no admite segunda cuota",
    );
  }

  if (input.installmentNumber !== 2) {
    throw new HttpError(
      400,
      "INVALID_INSTALLMENT_NUMBER",
      "Commercial second installment must use installment number 2",
    );
  }

  if (existingSubmission.paymentReceipts.length >= existingSubmission.installmentCountExpected) {
    throw new HttpError(
      400,
      "COMMERCIAL_ALL_INSTALLMENTS_ALREADY_SUBMITTED",
      "Esta solicitud ya tiene todas sus cuotas informadas",
    );
  }

  const existingDueAt = resolveCommercialSecondInstallmentDueAt({
    createdAt: existingSubmission.createdAt,
    secondInstallmentDueAt: existingSubmission.secondInstallmentDueAt,
    paymentPlanType: existingSubmission.paymentPlanType,
  });
  const secondInstallmentExpired = isCommercialSecondInstallmentExpired(
    existingDueAt,
  );

  if (secondInstallmentExpired) {
    throw new HttpError(
      400,
      "COMMERCIAL_SECOND_INSTALLMENT_EXPIRED",
      getCommercialSecondInstallmentExpiredMessage(),
      {
        secondInstallmentDueAt: existingDueAt,
      },
    );
  }

  const expectedAmount =
    existingSubmission.installmentAmountExpected !== null
      ? Number(existingSubmission.installmentAmountExpected)
      : Number(existingSubmission.totalAmountExpected) / 2;

  if (input.amountReported !== expectedAmount) {
    throw new HttpError(
      400,
      "INVALID_AMOUNT_REPORTED",
      "Invalid reported amount",
    );
  }

  const uploadStartedAt = nowMs();
  const uploadedReceipt = await uploadReceiptBuffer(file);
  const uploadMs = getElapsedMs(uploadStartedAt);

  try {
    const transactionStartedAt = nowMs();
    const result = await prisma.$transaction(async (tx) => {
      const paymentReceipt = await tx.commercialPaymentReceipt.create({
        data: {
          commercialSubmissionId: existingSubmission.id,
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

      return {
        paymentReceipt,
      };
    });

    console.info(
      `[commercial-submissions.additional-receipt.create] trackingCode=${formatCommercialTrackingCode(
        existingSubmission.id,
      )} installment=${input.installmentNumber} receiptSizeBytes=${file.size} uploadMs=${uploadMs} transactionMs=${getElapsedMs(
        transactionStartedAt,
      )}`,
    );

    return toCommercialAdditionalReceiptCreatedDto({
      submissionId: existingSubmission.id,
      trackingCode: formatCommercialTrackingCode(existingSubmission.id),
      status: existingSubmission.status,
      paymentPlanType: existingSubmission.paymentPlanType,
      installmentCountExpected: existingSubmission.installmentCountExpected,
      installmentAmountExpected:
        existingSubmission.installmentAmountExpected !== null
          ? Number(existingSubmission.installmentAmountExpected)
          : null,
      secondInstallmentDueAt: existingDueAt,
      secondInstallmentExpired: false,
      receipt: {
        installmentNumber: result.paymentReceipt.installmentNumber,
        status: result.paymentReceipt.status,
      },
      createdAt: result.paymentReceipt.createdAt,
      message:
        "Se recibio el comprobante de la segunda cuota y esta pendiente de revision",
    });
  } catch (error) {
    await destroyUploadedReceipt(
      uploadedReceipt.publicId,
      uploadedReceipt.resourceType,
    );
    throw error;
  }
};

const getCommercialSubmissionStatus = async (
  commercialSubmissionId: string,
): Promise<CommercialSubmissionStatusResult> => {
  const normalizedId = normalizeCommercialTrackingCode(commercialSubmissionId);
  const submission = await prisma.commercialSubmission.findUnique({
    where: {
      id: normalizedId,
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
      "COMMERCIAL_SUBMISSION_NOT_FOUND",
      "No encontramos la solicitud comercial",
    );
  }

  const resolvedSecondInstallmentDueAt = resolveCommercialSecondInstallmentDueAt({
    createdAt: submission.createdAt,
    secondInstallmentDueAt: submission.secondInstallmentDueAt,
    paymentPlanType: submission.paymentPlanType,
  });
  const secondInstallmentExpired = isCommercialSecondInstallmentExpired(
    resolvedSecondInstallmentDueAt,
  );
  const approvedReceiptsCount = submission.paymentReceipts.filter(
    (receipt) => receipt.status === PaymentReceiptStatus.APPROVED,
  ).length;
  const pendingReceiptsCount = submission.paymentReceipts.filter(
    (receipt) => receipt.status === PaymentReceiptStatus.PENDING_REVIEW,
  ).length;
  const secondInstallmentUploadAllowed =
    submission.paymentPlanType === "TWO_INSTALLMENTS" &&
    submission.paymentReceipts.length < submission.installmentCountExpected &&
    !secondInstallmentExpired;

  return toPublicCommercialSubmissionStatusDto({
    submissionId: submission.id,
    trackingCode: formatCommercialTrackingCode(submission.id),
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
    status: submission.status,
    commercial: {
      kind: submission.commercialKind,
      optionCode: submission.commercialOptionCode,
      label: submission.commercialOptionLabelSnapshot,
      companyName: submission.companyName,
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

const recoverCommercialTrackingCode = async ({
  email,
}: RecoverCommercialTrackingCodeInput): Promise<RecoverCommercialTrackingCodeResult> => {
  const submissions = await prisma.commercialSubmission.findMany({
    where: {
      email,
      commercialKind: "STAND",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const recoverableTrackingCodes = submissions.map((submission) =>
    formatCommercialTrackingCode(submission.id),
  );

  if (recoverableTrackingCodes.length > 0) {
    if (!hasEmailTransportConfigured()) {
      throw new Error("Email transport is not configured");
    }

    await sendCommercialTrackingCodeRecoveryEmail({
      to: email,
      trackingCodes: recoverableTrackingCodes,
    });
  }

  return toCommercialTrackingCodeRecoveryResponseDto({
    found: recoverableTrackingCodes.length > 0,
    message:
      recoverableTrackingCodes.length > 0
        ? "Encontramos una solicitud de stand asociada a ese email y enviamos el codigo por correo."
        : "No encontramos una solicitud de stand asociada a ese email.",
  });
};

const getCommercialPricingCatalog =
  async (): Promise<CommercialPricingCatalogResult> => {
    return toCommercialPricingCatalogDto(getCommercialPricingCatalogConfig());
  };

const requestCommercialStandDiscountCoupon = async (
  input: RequestCommercialStandDiscountCouponInput,
): Promise<RequestCommercialStandDiscountCouponResult> => {
  return toCommercialDiscountCouponRequestResponseDto(
    await requestCommercialStandDiscountCouponService(input),
  );
};

const validateCommercialStandDiscountCoupon = async (
  input: ValidateCommercialStandDiscountCouponInput,
): Promise<ValidateCommercialStandDiscountCouponResult> => {
  return toCommercialDiscountCouponValidationResponseDto(
    await validateCommercialStandDiscountCouponService(input),
  );
};

export {
  createCommercialAdditionalReceipt,
  createCommercialSubmission,
  getCommercialPricingCatalog,
  getCommercialSubmissionStatus,
  recoverCommercialTrackingCode,
  requestCommercialStandDiscountCoupon,
  validateCommercialStandDiscountCoupon,
};
