import type {
  CommercialAdditionalReceiptCreatedDto,
  CommercialDiscountCouponRequestResponseDto,
  CommercialDiscountCouponValidationResponseDto,
  CommercialPricingCatalogDto,
  CommercialSubmissionCreatedDto,
  CommercialTrackingCodeRecoveryResponseDto,
  PublicCommercialSubmissionStatusDto,
  PublicAdditionalReceiptCreatedDto,
  PublicDiscountCouponRequestResponseDto,
  PublicDiscountCouponValidationResponseDto,
  PublicPricingCatalogDto,
  PublicSubmissionCreatedDto,
  PublicSubmissionStatusDto,
} from "../types/dto.types";

const toPublicSubmissionCreatedDto = (
  submission: PublicSubmissionCreatedDto,
): PublicSubmissionCreatedDto => {
  return submission;
};

const toPublicAdditionalReceiptCreatedDto = (
  receipt: PublicAdditionalReceiptCreatedDto,
): PublicAdditionalReceiptCreatedDto => {
  return receipt;
};

const toPublicSubmissionStatusDto = (
  submission: PublicSubmissionStatusDto,
): PublicSubmissionStatusDto => {
  return submission;
};

const toPublicPricingCatalogDto = (
  pricingCatalog: PublicPricingCatalogDto,
): PublicPricingCatalogDto => {
  return pricingCatalog;
};

const toPublicDiscountCouponRequestResponseDto = (
  response: PublicDiscountCouponRequestResponseDto,
): PublicDiscountCouponRequestResponseDto => {
  return response;
};

const toPublicDiscountCouponValidationResponseDto = (
  response: PublicDiscountCouponValidationResponseDto,
): PublicDiscountCouponValidationResponseDto => {
  return response;
};

const toCommercialPricingCatalogDto = (
  pricingCatalog: CommercialPricingCatalogDto,
): CommercialPricingCatalogDto => {
  return pricingCatalog;
};

const toCommercialDiscountCouponRequestResponseDto = (
  response: CommercialDiscountCouponRequestResponseDto,
): CommercialDiscountCouponRequestResponseDto => {
  return response;
};

const toCommercialDiscountCouponValidationResponseDto = (
  response: CommercialDiscountCouponValidationResponseDto,
): CommercialDiscountCouponValidationResponseDto => {
  return response;
};

const toCommercialSubmissionCreatedDto = (
  submission: CommercialSubmissionCreatedDto,
): CommercialSubmissionCreatedDto => {
  return submission;
};

const toCommercialAdditionalReceiptCreatedDto = (
  receipt: CommercialAdditionalReceiptCreatedDto,
): CommercialAdditionalReceiptCreatedDto => {
  return receipt;
};

const toPublicCommercialSubmissionStatusDto = (
  submission: PublicCommercialSubmissionStatusDto,
): PublicCommercialSubmissionStatusDto => {
  return submission;
};

const toCommercialTrackingCodeRecoveryResponseDto = (
  response: CommercialTrackingCodeRecoveryResponseDto,
): CommercialTrackingCodeRecoveryResponseDto => {
  return response;
};

export {
  toCommercialAdditionalReceiptCreatedDto,
  toCommercialDiscountCouponRequestResponseDto,
  toCommercialDiscountCouponValidationResponseDto,
  toCommercialPricingCatalogDto,
  toCommercialSubmissionCreatedDto,
  toCommercialTrackingCodeRecoveryResponseDto,
  toPublicAdditionalReceiptCreatedDto,
  toPublicCommercialSubmissionStatusDto,
  toPublicDiscountCouponRequestResponseDto,
  toPublicDiscountCouponValidationResponseDto,
  toPublicPricingCatalogDto,
  toPublicSubmissionCreatedDto,
  toPublicSubmissionStatusDto,
};
