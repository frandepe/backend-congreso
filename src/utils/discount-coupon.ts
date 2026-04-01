import crypto from "crypto";

const DISCOUNT_COUPON_PREFIX = "DESC";

const normalizeDiscountCouponCode = (value: string) => {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
};

const formatDiscountCouponCode = (value: string) => {
  const normalized = normalizeDiscountCouponCode(value);

  if (!normalized) {
    return "";
  }

  const chunks = normalized.match(/.{1,4}/g) ?? [];
  return chunks.join("-");
};

const generateDiscountCouponCode = () => {
  const randomValue = crypto.randomBytes(6).toString("hex").toUpperCase();
  return formatDiscountCouponCode(`${DISCOUNT_COUPON_PREFIX}${randomValue}`);
};

export {
  formatDiscountCouponCode,
  generateDiscountCouponCode,
  normalizeDiscountCouponCode,
};
