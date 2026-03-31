const TRACKING_CODE_PREFIX = "RCP";

const normalizeTrackingCode = (value: string): string => {
  const sanitized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!sanitized) {
    return "";
  }

  const withoutPrefix = sanitized.startsWith(TRACKING_CODE_PREFIX)
    ? sanitized.slice(TRACKING_CODE_PREFIX.length)
    : sanitized;

  return withoutPrefix.toLowerCase();
};

const formatTrackingCode = (registrationId: string): string => {
  const normalized = normalizeTrackingCode(registrationId);
  const chunks = normalized.toUpperCase().match(/.{1,4}/g) ?? [];

  return `${TRACKING_CODE_PREFIX}-${chunks.join("-")}`;
};

export { formatTrackingCode, normalizeTrackingCode };
