import type { AuthenticatedAdmin } from "../types/auth.types";
import type {
  AdminAuthResponseDto,
  AdminDto,
  AdminSubmissionDetailDto,
  AdminSubmissionListItemDto,
  AdminSubmissionUpdateDto,
} from "../types/dto.types";

const toAdminDto = (admin: AuthenticatedAdmin): AdminDto => {
  return {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    isActive: admin.isActive,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
};

const toAdminAuthResponseDto = (
  admin: AuthenticatedAdmin,
  token: string,
): AdminAuthResponseDto => {
  return {
    admin: toAdminDto(admin),
    token,
  };
};

const toAdminSubmissionListItemDto = (item: AdminSubmissionListItemDto): AdminSubmissionListItemDto => {
  return item;
};

const toAdminSubmissionDetailDto = (
  detail: AdminSubmissionDetailDto,
): AdminSubmissionDetailDto => {
  return {
    ...detail,
    receipts: [...detail.receipts].sort(
      (left, right) => left.installmentNumber - right.installmentNumber,
    ),
  };
};

const toAdminSubmissionUpdateDto = (
  submission: AdminSubmissionUpdateDto,
): AdminSubmissionUpdateDto => {
  return submission;
};

export {
  toAdminAuthResponseDto,
  toAdminDto,
  toAdminSubmissionDetailDto,
  toAdminSubmissionListItemDto,
  toAdminSubmissionUpdateDto,
};
