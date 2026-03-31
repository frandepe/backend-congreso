import { prisma } from "../lib/prisma";
import {
  toAdminSubmissionDetailDto,
  toAdminSubmissionListItemDto,
  toAdminSubmissionUpdateDto,
} from "../mappers/admin.mapper";
import { HttpError } from "../utils/http-error";
import type { AuthenticatedAdmin } from "../types/auth.types";
import type { Prisma } from "@prisma/client";
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
};

type UpdateAdminSubmissionInput = {
  submissionId: string;
  status?: string;
  internalNote?: string | null;
  admin: AuthenticatedAdmin;
};

const buildSubmissionWhere = ({
  status,
  registrationOptionCode,
  paymentPlanType,
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
  };
};

const listAdminSubmissions = async ({
  page,
  pageSize,
  status,
  registrationOptionCode,
  paymentPlanType,
}: ListAdminSubmissionsInput) => {
  const where = buildSubmissionWhere({
    status,
    registrationOptionCode,
    paymentPlanType,
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
    totalAmountExpected: Number(submission.totalAmountExpected),
    paymentPlanType: submission.paymentPlanType,
    installmentCountExpected: submission.installmentCountExpected,
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
  });

  if (!existingSubmission) {
    throw new HttpError(
      404,
      "SUBMISSION_NOT_FOUND",
      "No se ha encontrado la entrada",
    );
  }

  const updatedSubmission = await prisma.registrationSubmission.update({
    where: {
      id: submissionId,
    },
    data: {
      ...(status !== undefined ? { status: status as any } : {}),
      ...(internalNote !== undefined ? { internalNote } : {}),
      reviewedAt: new Date(),
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
