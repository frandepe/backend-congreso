import type {
  AdminRole,
  PaymentPlanType,
  PaymentReceiptStatus,
  RegistrationOptionCode,
  RegistrationStatus,
} from "@prisma/client";

export type AdminDto = {
  id: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminAuthResponseDto = {
  admin: AdminDto;
  token: string;
};

export type AdminSubmissionListItemDto = {
  id: string;
  createdAt: Date;
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  phone: string;
  registrationOptionCode: RegistrationOptionCode;
  registrationOptionLabelSnapshot: string;
  totalAmountExpected: number;
  paymentPlanType: PaymentPlanType;
  installmentCountExpected: number;
  approvedReceiptsCount: number;
  submittedReceiptsCount: number;
  status: RegistrationStatus;
  lastReviewedAt: Date | null;
  reviewedByAdminEmail?: string;
};

export type AdminSubmissionDetailReceiptDto = {
  id: string;
  installmentNumber: number;
  amountReported: number;
  paymentDate: Date | null;
  receiptUrl: string;
  receiptOriginalFilename: string | null;
  receiptMimeType: string | null;
  receiptSizeBytes: number | null;
  status: PaymentReceiptStatus;
  rejectionReason: string | null;
  reviewedAt: Date | null;
  reviewedByAdminEmail?: string;
};

export type AdminSubmissionDetailDto = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  phone: string;
  registrationOptionCode: RegistrationOptionCode;
  registrationOptionLabelSnapshot: string;
  currencyCode: string;
  totalAmountExpected: number;
  paymentPlanType: PaymentPlanType;
  installmentCountExpected: number;
  status: RegistrationStatus;
  notes: string | null;
  internalNote: string | null;
  reviewedAt: Date | null;
  reviewedByAdmin: { id: string; email: string } | null;
  receipts: AdminSubmissionDetailReceiptDto[];
};

export type AdminSubmissionUpdateDto = {
  id: string;
  status: RegistrationStatus;
  internalNote: string | null;
  reviewedAt: Date | null;
  reviewedByAdmin: { id: string; email: string } | null;
  updatedAt: Date;
};

export type PublicSubmissionCreatedDto = {
  registrationId: string;
  trackingCode: string;
  status: RegistrationStatus;
  registrationOption: {
    code: RegistrationOptionCode;
    label: string;
    totalAmountExpected: number;
  };
  paymentPlanType: PaymentPlanType;
  installmentCountExpected: number;
  receipt: {
    installmentNumber: number;
    status: PaymentReceiptStatus;
  };
  createdAt: Date;
  message: string;
};

export type PublicAdditionalReceiptCreatedDto = {
  registrationId: string;
  trackingCode: string;
  status: RegistrationStatus;
  paymentPlanType: PaymentPlanType;
  installmentCountExpected: number;
  receipt: {
    installmentNumber: number;
    status: PaymentReceiptStatus;
  };
  createdAt: Date;
  message: string;
};

export type PublicSubmissionStatusDto = {
  registrationId: string;
  trackingCode: string;
  createdAt: Date;
  updatedAt: Date;
  status: RegistrationStatus;
  registrationOption: {
    code: RegistrationOptionCode;
    label: string;
    totalAmountExpected: number;
  };
  paymentPlanType: PaymentPlanType;
  installmentCountExpected: number;
  submittedReceiptsCount: number;
  approvedReceiptsCount: number;
  pendingReceiptsCount: number;
  receipts: Array<{
    installmentNumber: number;
    status: PaymentReceiptStatus;
    createdAt: Date;
  }>;
};

export type PublicTrackingCodeRecoveryResponseDto = {
  found: boolean;
  message: string;
};

export type PublicPendingSecondInstallmentLookupResponseDto = {
  found: boolean;
  trackingCode: string | null;
  participantName: string | null;
  message: string;
};
