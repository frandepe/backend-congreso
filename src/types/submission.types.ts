import type {
  PaymentPlanType,
  RegistrationOptionCode,
  RegistrationStatus,
  PaymentReceiptStatus,
} from "@prisma/client";
import type { PublicSubmissionStatusDto } from "./dto.types";
import type { PublicTrackingCodeRecoveryResponseDto } from "./dto.types";
import type { PublicPendingSecondInstallmentLookupResponseDto } from "./dto.types";
import type { PublicPricingCatalogDto } from "./dto.types";
import type {
  PublicDiscountCouponRequestResponseDto,
  PublicDiscountCouponValidationResponseDto,
} from "./dto.types";

export type CreateInitialSubmissionInput = {
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  phone: string;
  registrationOptionCode: RegistrationOptionCode;
  paymentPlanType: PaymentPlanType;
  installmentNumber: number;
  amountReported: number;
  discountCouponCode?: string;
  paymentDate?: Date;
  notes?: string;
};

export type CreateInitialSubmissionResult = {
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

export type CreateAdditionalReceiptInput = {
  registrationId: string;
  installmentNumber: number;
  amountReported: number;
  paymentDate?: Date;
};

export type CreateAdditionalReceiptResult = {
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

export type PublicSubmissionStatusResult = PublicSubmissionStatusDto;

export type RecoverTrackingCodeInput = {
  email: string;
};

export type RecoverTrackingCodeResult = PublicTrackingCodeRecoveryResponseDto;

export type FindPendingSecondInstallmentInput = {
  email?: string;
  dni?: string;
};

export type FindPendingSecondInstallmentResult =
  PublicPendingSecondInstallmentLookupResponseDto;

export type PublicPricingCatalogResult = PublicPricingCatalogDto;

export type RequestDiscountCouponInput = {
  email: string;
};

export type RequestDiscountCouponResult =
  PublicDiscountCouponRequestResponseDto;

export type ValidateDiscountCouponInput = {
  email: string;
  couponCode: string;
};

export type ValidateDiscountCouponResult =
  PublicDiscountCouponValidationResponseDto;
