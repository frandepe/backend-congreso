import { PaymentReceiptStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http-error";
import type { AuthenticatedAdmin } from "../types/auth.types";

type ListAdminCommercialSubmissionsInput = {
  page: number;
  pageSize: number;
  status?: string;
  commercialKind?: string;
  commercialOptionCode?: string;
  hasDiscountCoupon?: string;
};

type UpdateAdminCommercialSubmissionInput = {
  submissionId: string;
  status?: string;
  internalNote?: string | null;
  admin: AuthenticatedAdmin;
};

const getReceiptStatusForSubmissionStatus = (status?: string) => {
  if (status === "FULLY_PAID" || status === "PARTIALLY_PAID") {
    return PaymentReceiptStatus.APPROVED;
  }

  if (status === "PENDING_REVIEW") {
    return PaymentReceiptStatus.PENDING_REVIEW;
  }

  if (status === "REJECTED") {
    return PaymentReceiptStatus.REJECTED;
  }

  return null;
};

const buildWhere = ({
  status,
  commercialKind,
  commercialOptionCode,
  hasDiscountCoupon,
}: Omit<ListAdminCommercialSubmissionsInput, "page" | "pageSize">): Prisma.CommercialSubmissionWhereInput => {
  return {
    ...(status ? { status: status as any } : {}),
    ...(commercialKind ? { commercialKind: commercialKind as any } : {}),
    ...(commercialOptionCode
      ? { commercialOptionCode: commercialOptionCode as any }
      : {}),
    ...(hasDiscountCoupon === "true"
      ? {
          discountAppliedAmount: {
            not: null,
          },
        }
      : {}),
  };
};

const listAdminCommercialSubmissions = async ({
  page,
  pageSize,
  status,
  commercialKind,
  commercialOptionCode,
  hasDiscountCoupon,
}: ListAdminCommercialSubmissionsInput) => {
  const where = buildWhere({
    status,
    commercialKind,
    commercialOptionCode,
    hasDiscountCoupon,
  });

  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.commercialSubmission.findMany({
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
          orderBy: {
            installmentNumber: "desc",
          },
        },
      },
    }),
    prisma.commercialSubmission.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      companyName: item.companyName,
      contactFirstName: item.contactFirstName,
      contactLastName: item.contactLastName,
      email: item.email,
      phone: item.phone,
      commercialKind: item.commercialKind,
      commercialOptionCode: item.commercialOptionCode,
      commercialOptionLabelSnapshot: item.commercialOptionLabelSnapshot,
      totalAmountExpected: Number(item.totalAmountExpected),
      paymentPlanType: item.paymentPlanType,
      installmentCountExpected: item.installmentCountExpected,
      submittedReceiptsCount: item.paymentReceipts.length,
      hasDiscountCoupon: item.discountAppliedAmount !== null,
      receiptStatus: item.paymentReceipts[0]?.status ?? null,
      status: item.status,
      lastReviewedAt: item.reviewedAt,
      reviewedByAdminEmail: item.reviewedByAdmin?.email,
    })),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
};

const getAdminCommercialSubmissionDetail = async (submissionId: string) => {
  const submission = await prisma.commercialSubmission.findUnique({
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
        include: {
          reviewedByAdmin: {
            select: {
              email: true,
            },
          },
        },
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
      "No se ha encontrado la entrada comercial",
    );
  }

  return {
    id: submission.id,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
    companyName: submission.companyName,
    contactFirstName: submission.contactFirstName,
    contactLastName: submission.contactLastName,
    email: submission.email,
    phone: submission.phone,
    websiteOrSocialUrl: submission.websiteOrSocialUrl,
    commercialKind: submission.commercialKind,
    commercialOptionCode: submission.commercialOptionCode,
    commercialOptionLabelSnapshot: submission.commercialOptionLabelSnapshot,
    currencyCode: submission.currencyCode,
    baseAmountExpected: Number(submission.baseAmountExpected),
    equipmentAdditionalAmount:
      submission.equipmentAdditionalAmount !== null
        ? Number(submission.equipmentAdditionalAmount)
        : null,
    discountAppliedAmount:
      submission.discountAppliedAmount !== null
        ? Number(submission.discountAppliedAmount)
        : null,
    discountEligibleEmailNormalized: submission.discountEligibleEmailNormalized,
    discountCouponCode: submission.usedDiscountCoupon?.code ?? null,
    totalAmountExpected: Number(submission.totalAmountExpected),
    paymentPlanType: submission.paymentPlanType,
    installmentCountExpected: submission.installmentCountExpected,
    installmentAmountExpected:
      submission.installmentAmountExpected !== null
        ? Number(submission.installmentAmountExpected)
        : null,
    secondInstallmentDueAt: submission.secondInstallmentDueAt,
    secondInstallmentExpired:
      submission.paymentPlanType === "TWO_INSTALLMENTS" &&
      submission.secondInstallmentDueAt !== null
        ? new Date().getTime() > submission.secondInstallmentDueAt.getTime()
        : false,
    includesEquipment: submission.includesEquipment,
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
  };
};

const updateAdminCommercialSubmission = async ({
  submissionId,
  status,
  internalNote,
  admin,
}: UpdateAdminCommercialSubmissionInput) => {
  const existingSubmission = await prisma.commercialSubmission.findUnique({
    where: {
      id: submissionId,
    },
    select: {
      id: true,
      paymentReceipts: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!existingSubmission) {
    throw new HttpError(
      404,
      "COMMERCIAL_SUBMISSION_NOT_FOUND",
      "No se ha encontrado la entrada comercial",
    );
  }

  const reviewedAt = new Date();

  const updatedSubmission = await prisma.$transaction(async (tx) => {
    if (status !== undefined && existingSubmission.paymentReceipts.length > 0) {
      const receiptStatus = getReceiptStatusForSubmissionStatus(status);

      if (receiptStatus) {
        await tx.commercialPaymentReceipt.updateMany({
          where: {
            commercialSubmissionId: submissionId,
          },
          data: {
            status: receiptStatus,
            rejectionReason: null,
            reviewedAt,
            reviewedByAdminId: admin.id,
          },
        });
      }
    }

    return tx.commercialSubmission.update({
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

  return {
    id: updatedSubmission.id,
    status: updatedSubmission.status,
    internalNote: updatedSubmission.internalNote,
    reviewedAt: updatedSubmission.reviewedAt,
    reviewedByAdmin: updatedSubmission.reviewedByAdmin,
    updatedAt: updatedSubmission.updatedAt,
  };
};

export {
  getAdminCommercialSubmissionDetail,
  listAdminCommercialSubmissions,
  updateAdminCommercialSubmission,
};
