import { PaymentReceiptStatus, RegistrationStatus } from "@prisma/client";
import {
  toPublicAdditionalReceiptCreatedDto,
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
  getExpectedInstallmentAmount,
  getInstallmentCountExpected,
  getRegistrationOption,
} from "../config/registration-options";
import { HttpError } from "../utils/http-error";
import type {
  CreateAdditionalReceiptInput,
  CreateAdditionalReceiptResult,
  CreateInitialSubmissionInput,
  CreateInitialSubmissionResult,
  FindPendingSecondInstallmentInput,
  FindPendingSecondInstallmentResult,
  PublicSubmissionStatusResult,
  RecoverTrackingCodeInput,
  RecoverTrackingCodeResult,
} from "../types/submission.types";
import {
  formatTrackingCode,
  normalizeTrackingCode,
} from "../utils/tracking-code";

const nowMs = () => performance.now();

const getElapsedMs = (startedAt: number) =>
  Number((nowMs() - startedAt).toFixed(1));

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

  const registrationOption = getRegistrationOption(
    input.registrationOptionCode,
  );
  const totalAmountExpected = registrationOption.totalAmountExpected;
  const installmentCountExpected = getInstallmentCountExpected(
    input.paymentPlanType,
  );
  const expectedInstallmentAmount = getExpectedInstallmentAmount(
    totalAmountExpected,
    input.paymentPlanType,
  );

  if (input.amountReported !== expectedInstallmentAmount) {
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
          totalAmountExpected,
          paymentPlanType: input.paymentPlanType,
          installmentCountExpected,
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

      return {
        registrationSubmission,
        registrationInsertMs,
        receiptInsertMs,
      };
    });
    const transactionMs = getElapsedMs(transactionStartedAt);

    const trackingCode = formatTrackingCode(result.registrationSubmission.id);
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
      });
    }

    return toPublicSubmissionCreatedDto({
      registrationId: result.registrationSubmission.id,
      trackingCode,
      status: result.registrationSubmission.status,
      registrationOption: {
        code: input.registrationOptionCode,
        label: registrationOption.label,
        totalAmountExpected,
      },
      paymentPlanType: input.paymentPlanType,
      installmentCountExpected,
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
      "This submission does not allow an additional receipt",
    );
  }

  if (input.installmentNumber === 1) {
    throw new HttpError(
      400,
      "INVALID_INSTALLMENT_NUMBER",
      "Additional receipt must use installment number 2",
    );
  }

  if (input.installmentNumber > existingSubmission.installmentCountExpected) {
    throw new HttpError(
      400,
      "INVALID_INSTALLMENT_NUMBER",
      "Installment number exceeds the expected installment count",
    );
  }

  const existingReceipt = existingSubmission.paymentReceipts.find(
    (receipt) => receipt.installmentNumber === input.installmentNumber,
  );

  if (existingReceipt) {
    throw new HttpError(
      409,
      "INSTALLMENT_ALREADY_SUBMITTED",
      "This installment has already been submitted",
    );
  }

  const expectedInstallmentAmount = getExpectedInstallmentAmount(
    Number(existingSubmission.totalAmountExpected),
    existingSubmission.paymentPlanType,
  );

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
      message: "No encontramos una segunda cuota pendiente para esos datos.",
    };
  }

  return {
    found: true,
    trackingCode: formatTrackingCode(matchedSubmission.id),
    participantName: `${matchedSubmission.firstName} ${matchedSubmission.lastName}`,
    message:
      "Encontramos una inscripcion previa en 2 cuotas con segunda cuota pendiente.",
  };
};

export {
  createAdditionalReceipt,
  createInitialSubmission,
  findPendingSecondInstallment,
  getPublicSubmissionStatus,
  recoverTrackingCode,
};
