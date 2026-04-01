import { prisma } from "../lib/prisma";
import {
  toAdminSubmissionDetailDto,
  toAdminSubmissionListItemDto,
  toAdminSubmissionUpdateDto,
} from "../mappers/admin.mapper";
import { HttpError } from "../utils/http-error";
import type { AuthenticatedAdmin } from "../types/auth.types";
import type { Prisma } from "@prisma/client";
import { PaymentReceiptStatus } from "@prisma/client";
import type {
  AdminSubmissionDetailDto,
  AdminSubmissionListItemDto,
  AdminSubmissionUpdateDto,
} from "../types/dto.types";

type ListAdminSubmissionsInput = {
  page: number;
  pageSize: number;
  status?: string;
  registrationOptionCode?: string;
  paymentPlanType?: string;
  hasDiscountCoupon?: string;
};

type UpdateAdminSubmissionInput = {
  submissionId: string;
  status?: string;
  internalNote?: string | null;
  admin: AuthenticatedAdmin;
};

const getReceiptStatusForSubmissionStatus = ({
  status,
  installmentNumber,
}: {
  status?: string;
  installmentNumber: number;
}) => {
  if (status === "FULLY_PAID") {
    return PaymentReceiptStatus.APPROVED;
  }

  if (status === "PARTIALLY_PAID") {
    return installmentNumber === 1
      ? PaymentReceiptStatus.APPROVED
      : PaymentReceiptStatus.PENDING_REVIEW;
  }

  if (status === "PENDING_REVIEW") {
    return PaymentReceiptStatus.PENDING_REVIEW;
  }

  if (status === "REJECTED") {
    return PaymentReceiptStatus.REJECTED;
  }

  return null;
};

const buildReceiptStatusSyncData = ({
  receiptStatus,
  adminId,
  reviewedAt,
}: {
  receiptStatus: PaymentReceiptStatus;
  adminId: string;
  reviewedAt: Date;
}): Prisma.PaymentReceiptSubmissionUpdateInput => {
  return {
    status: receiptStatus,
    rejectionReason: null,
    reviewedAt,
    reviewedByAdmin: {
      connect: {
        id: adminId,
      },
    },
  };
};

const buildSubmissionWhere = ({
  status,
  registrationOptionCode,
  paymentPlanType,
  hasDiscountCoupon,
}: Omit<
  ListAdminSubmissionsInput,
  "page" | "pageSize"
>): Prisma.RegistrationSubmissionWhereInput => {
  return {
    ...(status
      ? { status: status as Prisma.RegistrationSubmissionWhereInput["status"] }
      : {}),
    ...(registrationOptionCode
      ? {
          registrationOptionCode:
            registrationOptionCode as Prisma.RegistrationSubmissionWhereInput["registrationOptionCode"],
        }
      : {}),
    ...(paymentPlanType
      ? {
          paymentPlanType:
            paymentPlanType as Prisma.RegistrationSubmissionWhereInput["paymentPlanType"],
        }
      : {}),
    ...(hasDiscountCoupon === "true"
      ? {
          discountAppliedPercentage: {
            not: null,
          },
        }
      : {}),
  };
};

const listAdminSubmissions = async ({
  page,
  pageSize,
  status,
  registrationOptionCode,
  paymentPlanType,
  hasDiscountCoupon,
}: ListAdminSubmissionsInput) => {
  const where = buildSubmissionWhere({
    status,
    registrationOptionCode,
    paymentPlanType,
    hasDiscountCoupon,
  });

  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.registrationSubmission.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        reviewedByAdmin: {
          select: {
            email: true,
          },
        },
        paymentReceipts: {
          select: {
            status: true,
          },
        },
      },
    }),
    prisma.registrationSubmission.count({ where }),
  ]);

  return {
    items: items.map((item) =>
      toAdminSubmissionListItemDto({
        id: item.id,
        createdAt: item.createdAt,
        firstName: item.firstName,
        lastName: item.lastName,
        dni: item.dni,
        email: item.email,
        phone: item.phone,
        registrationOptionCode: item.registrationOptionCode,
        registrationOptionLabelSnapshot: item.registrationOptionLabelSnapshot,
        totalAmountExpected: Number(item.totalAmountExpected),
        paymentPlanType: item.paymentPlanType,
        installmentCountExpected: item.installmentCountExpected,
        approvedReceiptsCount: item.paymentReceipts.filter(
          (receipt) => receipt.status === "APPROVED",
        ).length,
        submittedReceiptsCount: item.paymentReceipts.length,
        status: item.status,
        lastReviewedAt: item.reviewedAt,
        reviewedByAdminEmail: item.reviewedByAdmin?.email,
      }),
    ),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
};

const getAdminSubmissionDetail = async (submissionId: string) => {
  const submission = await prisma.registrationSubmission.findUnique({
    where: {
      id: submissionId,
    },
    include: {
      usedDiscountCoupon: {
        select: {
          code: true,
        },
      },
      reviewedByAdmin: {
        select: {
          id: true,
          email: true,
        },
      },
      paymentReceipts: {
        orderBy: {
          installmentNumber: "asc",
        },
        include: {
          reviewedByAdmin: {
            select: {
              email: true,
            },
          },
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

  const submissionSecondInstallmentDueAt = (submission as any)
    .secondInstallmentDueAt as Date | null | undefined;
  const secondInstallmentDueAt =
    submission.paymentPlanType === "TWO_INSTALLMENTS"
      ? submissionSecondInstallmentDueAt ??
        (() => {
          const fallbackDueAt = new Date(submission.createdAt);
          fallbackDueAt.setDate(fallbackDueAt.getDate() + 30);
          return fallbackDueAt;
        })()
      : null;
  const secondInstallmentExpired = Boolean(
    secondInstallmentDueAt &&
      submission.paymentPlanType === "TWO_INSTALLMENTS" &&
      submission.paymentReceipts.length < submission.installmentCountExpected &&
      new Date().getTime() > secondInstallmentDueAt.getTime(),
  );

  return toAdminSubmissionDetailDto({
    id: submission.id,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
    firstName: submission.firstName,
    lastName: submission.lastName,
    dni: submission.dni,
    email: submission.email,
    phone: submission.phone,
    registrationOptionCode: submission.registrationOptionCode,
    registrationOptionLabelSnapshot: submission.registrationOptionLabelSnapshot,
    currencyCode: submission.currencyCode,
    baseAmountExpected:
      submission.baseAmountExpected !== null
        ? Number(submission.baseAmountExpected)
        : null,
    discountAppliedPercentage: submission.discountAppliedPercentage,
    discountAppliedAmount:
      submission.discountAppliedAmount !== null
        ? Number(submission.discountAppliedAmount)
        : null,
    discountEligibleEmailNormalized:
      submission.discountEligibleEmailNormalized,
    discountCouponCode: submission.usedDiscountCoupon?.code ?? null,
    totalAmountExpected: Number(submission.totalAmountExpected),
    installmentsAllowed: submission.installmentsAllowed,
    paymentPlanType: submission.paymentPlanType,
    installmentCountExpected: submission.installmentCountExpected,
    installmentAmountExpected:
      submission.installmentAmountExpected !== null
        ? Number(submission.installmentAmountExpected)
        : submission.installmentCountExpected > 0
          ? Number(submission.totalAmountExpected) /
            submission.installmentCountExpected
        : null,
    secondInstallmentDueAt,
    secondInstallmentExpired,
    status: submission.status,
    notes: submission.notes,
    internalNote: submission.internalNote,
    reviewedAt: submission.reviewedAt,
    reviewedByAdmin: submission.reviewedByAdmin,
    receipts: submission.paymentReceipts.map((receipt) => ({
      id: receipt.id,
      installmentNumber: receipt.installmentNumber,
      amountReported: Number(receipt.amountReported),
      paymentDate: receipt.paymentDate,
      receiptUrl: receipt.receiptUrl,
      receiptOriginalFilename: receipt.receiptOriginalFilename,
      receiptMimeType: receipt.receiptMimeType,
      receiptSizeBytes: receipt.receiptSizeBytes,
      status: receipt.status,
      rejectionReason: receipt.rejectionReason,
      reviewedAt: receipt.reviewedAt,
      reviewedByAdminEmail: receipt.reviewedByAdmin?.email,
    })),
  });
};

const updateAdminSubmission = async ({
  submissionId,
  status,
  internalNote,
  admin,
}: UpdateAdminSubmissionInput) => {
  const existingSubmission = await prisma.registrationSubmission.findUnique({
    where: {
      id: submissionId,
    },
    select: {
      id: true,
      paymentReceipts: {
        select: {
          id: true,
          installmentNumber: true,
        },
      },
    },
  });

  if (!existingSubmission) {
    throw new HttpError(
      404,
      "SUBMISSION_NOT_FOUND",
      "No se ha encontrado la entrada",
    );
  }

  const reviewedAt = new Date();

  const updatedSubmission = await prisma.$transaction(async (tx) => {
    if (status !== undefined && existingSubmission.paymentReceipts.length > 0) {
      await Promise.all(
        existingSubmission.paymentReceipts.map((receipt) => {
          const receiptStatus = getReceiptStatusForSubmissionStatus({
            status,
            installmentNumber: receipt.installmentNumber,
          });

          if (!receiptStatus) {
            return Promise.resolve(null);
          }

          return tx.paymentReceiptSubmission.update({
            where: {
              id: receipt.id,
            },
            data: buildReceiptStatusSyncData({
              receiptStatus,
              adminId: admin.id,
              reviewedAt,
            }),
          });
        }),
      );
    }

    return tx.registrationSubmission.update({
      where: {
        id: submissionId,
      },
      data: {
        ...(status !== undefined ? { status: status as any } : {}),
        ...(internalNote !== undefined ? { internalNote } : {}),
        reviewedAt,
        reviewedByAdminId: admin.id,
      },
      include: {
        reviewedByAdmin: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  });

  return toAdminSubmissionUpdateDto({
    id: updatedSubmission.id,
    status: updatedSubmission.status,
    internalNote: updatedSubmission.internalNote,
    reviewedAt: updatedSubmission.reviewedAt,
    reviewedByAdmin: updatedSubmission.reviewedByAdmin,
    updatedAt: updatedSubmission.updatedAt,
  });
};

export {
  getAdminSubmissionDetail,
  listAdminSubmissions,
  updateAdminSubmission,
};
