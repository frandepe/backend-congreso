const COMMERCIAL_TRACKING_CODE_PREFIX = "COM";

const normalizeCommercialTrackingCode = (value: string): string => {
  const sanitized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!sanitized) {
    return "";
  }

  const withoutPrefix = sanitized.startsWith(COMMERCIAL_TRACKING_CODE_PREFIX)
    ? sanitized.slice(COMMERCIAL_TRACKING_CODE_PREFIX.length)
    : sanitized;

  return withoutPrefix.toLowerCase();
};

const formatCommercialTrackingCode = (submissionId: string): string => {
  const normalized = normalizeCommercialTrackingCode(submissionId);
  const chunks = normalized.toUpperCase().match(/.{1,4}/g) ?? [];

  return `${COMMERCIAL_TRACKING_CODE_PREFIX}-${chunks.join("-")}`;
};

export { formatCommercialTrackingCode, normalizeCommercialTrackingCode };
