import type {
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

export {
  toPublicAdditionalReceiptCreatedDto,
  toPublicDiscountCouponRequestResponseDto,
  toPublicDiscountCouponValidationResponseDto,
  toPublicPricingCatalogDto,
  toPublicSubmissionCreatedDto,
  toPublicSubmissionStatusDto,
};
