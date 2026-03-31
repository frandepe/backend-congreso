import type {
  PublicAdditionalReceiptCreatedDto,
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

export {
  toPublicAdditionalReceiptCreatedDto,
  toPublicSubmissionCreatedDto,
  toPublicSubmissionStatusDto,
};
