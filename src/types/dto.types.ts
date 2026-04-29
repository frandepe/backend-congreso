import type {
  AdminRole,
  CommercialKind,
  CommercialOptionCode,
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
  baseAmountExpected: number | null;
  discountAppliedPercentage: number | null;
  discountAppliedAmount: number | null;
  discountEligibleEmailNormalized: string | null;
  discountCouponCode: string | null;
  totalAmountExpected: number;
  installmentsAllowed: boolean;
  paymentPlanType: PaymentPlanType;
  installmentCountExpected: number;
  installmentAmountExpected: number | null;
  secondInstallmentDueAt: Date | null;
  secondInstallmentExpired: boolean;
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
  installmentAmountExpected: number | null;
  secondInstallmentDueAt: Date | null;
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
  installmentAmountExpected: number | null;
  secondInstallmentDueAt: Date | null;
  secondInstallmentExpired: boolean;
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
  installmentAmountExpected: number | null;
  secondInstallmentDueAt: Date | null;
  secondInstallmentExpired: boolean;
  secondInstallmentUploadAllowed: boolean;
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
  secondInstallmentDueAt: Date | null;
  secondInstallmentExpired: boolean;
  secondInstallmentUploadAllowed: boolean;
  message: string;
};

export type PublicPricingPlanDto = {
  type: PaymentPlanType;
  label: string;
  installmentCount: number;
  baseInstallmentAmount: number;
  discountedInstallmentAmount: number;
};

export type PublicPricingOptionDto = {
  code: RegistrationOptionCode;
  label: string;
  baseTotalAmount: number;
  discountedTotalAmount: number;
  paymentPlans: PublicPricingPlanDto[];
};

export type PublicPricingCatalogDto = {
  discountPercentage: number;
  installmentsAvailable: boolean;
  installmentsAvailableUntil: Date;
  installmentsTimezone: string;
  options: PublicPricingOptionDto[];
};

export type PublicDiscountCouponRequestResponseDto = {
  issued: boolean;
  message: string;
  expiresAt: Date | null;
};

export type PublicDiscountCouponValidationResponseDto = {
  valid: boolean;
  message: string;
  discountPercentage: number | null;
  expiresAt: Date | null;
};

export type CommercialStandPricingOptionDto = {
  code: CommercialOptionCode;
  label: string;
  baseAmount: number;
  discountedAmount: number;
  paymentPlans: Array<{
    type: PaymentPlanType;
    label: string;
    installmentCount: number;
  }>;
};

export type CommercialAdvertisingPricingOptionDto = {
  code: CommercialOptionCode;
  label: string;
  totalAmount: number;
  paymentPlans: Array<{
    type: PaymentPlanType;
    label: string;
    installmentCount: number;
  }>;
};

export type CommercialPricingCatalogDto = {
  standDiscountAmount: number;
  installmentsAvailable: boolean;
  installmentsAvailableUntil: Date;
  installmentsTimezone: string;
  standOptions: CommercialStandPricingOptionDto[];
  advertisingOptions: CommercialAdvertisingPricingOptionDto[];
};

export type CommercialDiscountCouponRequestResponseDto = {
  issued: boolean;
  message: string;
  expiresAt: Date | null;
};

export type CommercialDiscountCouponValidationResponseDto = {
  valid: boolean;
  message: string;
  discountAmount: number | null;
  expiresAt: Date | null;
};

export type CommercialSubmissionCreatedDto = {
  submissionId: string;
  trackingCode: string;
  status: RegistrationStatus;
  commercial: {
    kind: CommercialKind;
    optionCode: CommercialOptionCode;
    label: string;
    companyName: string;
    baseAmountExpected: number;
    discountAppliedAmount: number | null;
    totalAmountExpected: number;
  };
  paymentPlanType: PaymentPlanType;
  installmentCountExpected: number;
  installmentAmountExpected: number | null;
  secondInstallmentDueAt: Date | null;
  receipt: {
    installmentNumber: number;
    status: PaymentReceiptStatus;
  };
  createdAt: Date;
  message: string;
};

export type CommercialAdditionalReceiptCreatedDto = {
  submissionId: string;
  trackingCode: string;
  status: RegistrationStatus;
  paymentPlanType: PaymentPlanType;
  installmentCountExpected: number;
  installmentAmountExpected: number | null;
  secondInstallmentDueAt: Date | null;
  secondInstallmentExpired: boolean;
  receipt: {
    installmentNumber: number;
    status: PaymentReceiptStatus;
  };
  createdAt: Date;
  message: string;
};

export type PublicCommercialSubmissionStatusDto = {
  submissionId: string;
  trackingCode: string;
  createdAt: Date;
  updatedAt: Date;
  status: RegistrationStatus;
  commercial: {
    kind: CommercialKind;
    optionCode: CommercialOptionCode;
    label: string;
    companyName: string;
    totalAmountExpected: number;
  };
  paymentPlanType: PaymentPlanType;
  installmentCountExpected: number;
  installmentAmountExpected: number | null;
  secondInstallmentDueAt: Date | null;
  secondInstallmentExpired: boolean;
  secondInstallmentUploadAllowed: boolean;
  submittedReceiptsCount: number;
  approvedReceiptsCount: number;
  pendingReceiptsCount: number;
  receipts: Array<{
    installmentNumber: number;
    status: PaymentReceiptStatus;
    createdAt: Date;
  }>;
};

export type CommercialTrackingCodeRecoveryResponseDto = {
  found: boolean;
  message: string;
};

export type AdminCommercialSubmissionListItemDto = {
  id: string;
  createdAt: Date;
  companyName: string;
  contactFirstName: string;
  contactLastName: string;
  email: string;
  phone: string;
  commercialKind: CommercialKind;
  commercialOptionCode: CommercialOptionCode;
  commercialOptionLabelSnapshot: string;
  totalAmountExpected: number;
  paymentPlanType: PaymentPlanType;
  installmentCountExpected: number;
  submittedReceiptsCount: number;
  hasDiscountCoupon: boolean;
  receiptStatus: PaymentReceiptStatus | null;
  status: RegistrationStatus;
  lastReviewedAt: Date | null;
  reviewedByAdminEmail?: string;
};

export type AdminCommercialSubmissionDetailReceiptDto = {
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

export type AdminCommercialSubmissionDetailDto = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  companyName: string;
  contactFirstName: string;
  contactLastName: string;
  email: string;
  phone: string;
  websiteOrSocialUrl: string | null;
  commercialKind: CommercialKind;
  commercialOptionCode: CommercialOptionCode;
  commercialOptionLabelSnapshot: string;
  currencyCode: string;
  baseAmountExpected: number;
  equipmentAdditionalAmount: number | null;
  discountAppliedAmount: number | null;
  discountEligibleEmailNormalized: string | null;
  discountCouponCode: string | null;
  totalAmountExpected: number;
  paymentPlanType: PaymentPlanType;
  installmentCountExpected: number;
  installmentAmountExpected: number | null;
  secondInstallmentDueAt: Date | null;
  secondInstallmentExpired: boolean;
  includesEquipment: boolean;
  status: RegistrationStatus;
  notes: string | null;
  internalNote: string | null;
  reviewedAt: Date | null;
  reviewedByAdmin: { id: string; email: string } | null;
  receipts: AdminCommercialSubmissionDetailReceiptDto[];
};

export type AdminCommercialSubmissionUpdateDto = {
  id: string;
  status: RegistrationStatus;
  internalNote: string | null;
  reviewedAt: Date | null;
  reviewedByAdmin: { id: string; email: string } | null;
  updatedAt: Date;
};
