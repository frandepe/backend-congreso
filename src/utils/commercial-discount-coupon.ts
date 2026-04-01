import crypto from "crypto";

const COMMERCIAL_DISCOUNT_COUPON_PREFIX = "EXPO";

const normalizeCommercialDiscountCouponCode = (value: string) => {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
};

const formatCommercialDiscountCouponCode = (value: string) => {
  const normalized = normalizeCommercialDiscountCouponCode(value);

  if (!normalized) {
    return "";
  }

  const chunks = normalized.match(/.{1,4}/g) ?? [];
  return chunks.join("-");
};

const generateCommercialDiscountCouponCode = () => {
  const randomValue = crypto.randomBytes(6).toString("hex").toUpperCase();
  return formatCommercialDiscountCouponCode(
    `${COMMERCIAL_DISCOUNT_COUPON_PREFIX}${randomValue}`,
  );
};

export {
  formatCommercialDiscountCouponCode,
  generateCommercialDiscountCouponCode,
  normalizeCommercialDiscountCouponCode,
};
