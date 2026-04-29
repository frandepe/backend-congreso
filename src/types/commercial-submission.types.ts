import type {
  CommercialKind,
  CommercialOptionCode,
  PaymentPlanType,
  PaymentReceiptStatus,
  RegistrationStatus,
} from "@prisma/client";
import type {
  CommercialAdditionalReceiptCreatedDto,
  CommercialDiscountCouponRequestResponseDto,
  CommercialDiscountCouponValidationResponseDto,
  CommercialPricingCatalogDto,
  CommercialSubmissionCreatedDto,
  CommercialTrackingCodeRecoveryResponseDto,
  PublicCommercialSubmissionStatusDto,
} from "./dto.types";

export type CreateCommercialSubmissionInput = {
  companyName: string;
  contactFirstName: string;
  contactLastName: string;
  email: string;
  phone: string;
  websiteOrSocialUrl?: string;
  commercialKind: CommercialKind;
  commercialOptionCode: CommercialOptionCode;
  paymentPlanType: PaymentPlanType;
  installmentNumber: number;
  amountReported: number;
  discountCouponCode?: string;
  paymentDate?: Date;
  notes?: string;
};

export type CreateCommercialSubmissionResult = {
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

export type CreateCommercialSubmissionDtoResult = CommercialSubmissionCreatedDto;

export type CommercialPricingCatalogResult = CommercialPricingCatalogDto;

export type CreateCommercialAdditionalReceiptInput = {
  installmentNumber: number;
  amountReported: number;
  paymentDate?: Date;
};

export type CreateCommercialAdditionalReceiptResult =
  CommercialAdditionalReceiptCreatedDto;

export type CommercialSubmissionStatusResult =
  PublicCommercialSubmissionStatusDto;

export type RecoverCommercialTrackingCodeInput = {
  email: string;
};

export type RecoverCommercialTrackingCodeResult =
  CommercialTrackingCodeRecoveryResponseDto;

export type RequestCommercialStandDiscountCouponInput = {
  email: string;
};

export type RequestCommercialStandDiscountCouponResult =
  CommercialDiscountCouponRequestResponseDto;

export type ValidateCommercialStandDiscountCouponInput = {
  email: string;
  couponCode: string;
};

export type ValidateCommercialStandDiscountCouponResult =
  CommercialDiscountCouponValidationResponseDto;
