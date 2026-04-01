import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { COMMERCIAL_STAND_DISCOUNT_AMOUNT } from "../config/commercial-options";
import { sendCommercialStandDiscountCouponEmail } from "./email.service";
import { HttpError } from "../utils/http-error";
import {
  formatCommercialDiscountCouponCode,
  generateCommercialDiscountCouponCode,
  normalizeCommercialDiscountCouponCode,
} from "../utils/commercial-discount-coupon";
import type {
  RequestCommercialStandDiscountCouponInput,
  RequestCommercialStandDiscountCouponResult,
  ValidateCommercialStandDiscountCouponInput,
  ValidateCommercialStandDiscountCouponResult,
} from "../types/commercial-submission.types";

const DISCOUNT_COUPON_EXPIRATION_MINUTES = 30;
const prismaAny = prisma as any;

const getCouponExpirationDate = () => {
  const now = new Date();
  return new Date(
    now.getTime() + DISCOUNT_COUPON_EXPIRATION_MINUTES * 60 * 1000,
  );
};

const getCommercialDiscountAlreadyUsedWhere = (
  email: string,
): Prisma.CommercialSubmissionWhereInput => {
  return {
    commercialKind: "STAND",
    discountEligibleEmailNormalized: email,
  };
};

const expireIssuedCommercialCoupons = async (
  tx: Prisma.TransactionClient,
  email: string,
) => {
  await (tx as any).commercialDiscountCoupon.updateMany({
    where: {
      emailNormalized: email,
      status: "ISSUED",
      expiresAt: {
        lte: new Date(),
      },
    },
    data: {
      status: "EXPIRED",
    },
  });
};

const createUniqueCommercialCouponCode = async (
  tx: Prisma.TransactionClient,
) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCommercialDiscountCouponCode();
    const existingCoupon = await (tx as any).commercialDiscountCoupon.findUnique({
      where: {
        code,
      },
      select: {
        id: true,
      },
    });

    if (!existingCoupon) {
      return code;
    }
  }

  throw new HttpError(
    500,
    "COMMERCIAL_DISCOUNT_COUPON_GENERATION_FAILED",
    "No se pudo generar un cupon unico para stands",
  );
};

const requestCommercialStandDiscountCoupon = async ({
  email,
}: RequestCommercialStandDiscountCouponInput): Promise<RequestCommercialStandDiscountCouponResult> => {
  const eligibleExhibitor =
    await prismaAny.commercialDiscountEligibleExhibitor.findUnique({
      where: {
        emailNormalized: email,
      },
    });

  if (!eligibleExhibitor || !eligibleExhibitor.isActive) {
    return {
      issued: false,
      message: "Ese email no esta habilitado para descuento de stand.",
      expiresAt: null,
    };
  }

  const discountAlreadyUsed = await prisma.commercialSubmission.findFirst({
    where: getCommercialDiscountAlreadyUsedWhere(email),
    select: {
      id: true,
    },
  });

  if (discountAlreadyUsed) {
    return {
      issued: false,
      message: "Ese email ya uso su descuento en una contratacion previa de stand.",
      expiresAt: null,
    };
  }

  const issuedCoupon = await prisma.$transaction(async (tx) => {
    await expireIssuedCommercialCoupons(tx, email);

    await (tx as any).commercialDiscountCoupon.updateMany({
      where: {
        emailNormalized: email,
        status: "ISSUED",
      },
      data: {
        status: "INVALIDATED",
      },
    });

    const code = await createUniqueCommercialCouponCode(tx);
    const expiresAt = getCouponExpirationDate();

    return (tx as any).commercialDiscountCoupon.create({
      data: {
        code,
        emailNormalized: email,
        status: "ISSUED",
        expiresAt,
      },
    });
  });

  await sendCommercialStandDiscountCouponEmail({
    to: email,
    couponCode: issuedCoupon.code,
    expiresAt: issuedCoupon.expiresAt,
  });

  return {
    issued: true,
    message: "Te enviamos un cupon de descuento para stands por email.",
    expiresAt: issuedCoupon.expiresAt,
  };
};

const validateCommercialStandDiscountCoupon = async ({
  email,
  couponCode,
}: ValidateCommercialStandDiscountCouponInput): Promise<ValidateCommercialStandDiscountCouponResult> => {
  const normalizedCouponCode =
    normalizeCommercialDiscountCouponCode(couponCode);
  const formattedCouponCode =
    formatCommercialDiscountCouponCode(normalizedCouponCode);

  if (!normalizedCouponCode) {
    return {
      valid: false,
      message: "El cupon ingresado no es valido.",
      discountAmount: null,
      expiresAt: null,
    };
  }

  const alreadyUsedDiscount = await prisma.commercialSubmission.findFirst({
    where: getCommercialDiscountAlreadyUsedWhere(email),
    select: {
      id: true,
    },
  });

  if (alreadyUsedDiscount) {
    return {
      valid: false,
      message: "Ese email ya uso su descuento en una contratacion previa de stand.",
      discountAmount: null,
      expiresAt: null,
    };
  }

  const coupon = await prismaAny.commercialDiscountCoupon.findFirst({
    where: {
      code: formattedCouponCode,
    },
  });

  if (!coupon || coupon.emailNormalized !== email) {
    return {
      valid: false,
      message: "El cupon ingresado no es valido.",
      discountAmount: null,
      expiresAt: null,
    };
  }

  if (coupon.status === "INVALIDATED") {
    return {
      valid: false,
      message: "Ese cupon fue invalidado por una reemision.",
      discountAmount: null,
      expiresAt: coupon.expiresAt,
    };
  }

  if (coupon.status === "USED") {
    return {
      valid: false,
      message: "Ese cupon ya fue usado.",
      discountAmount: null,
      expiresAt: coupon.expiresAt,
    };
  }

  if (
    coupon.status === "EXPIRED" ||
    coupon.expiresAt.getTime() <= Date.now()
  ) {
    if (coupon.status === "ISSUED") {
      await prismaAny.commercialDiscountCoupon.update({
        where: {
          id: coupon.id,
        },
        data: {
          status: "EXPIRED",
        },
      });
    }

    return {
      valid: false,
      message: "Ese cupon ya expiro.",
      discountAmount: null,
      expiresAt: coupon.expiresAt,
    };
  }

  return {
    valid: true,
    message: "Cupon valido.",
    discountAmount: COMMERCIAL_STAND_DISCOUNT_AMOUNT,
    expiresAt: coupon.expiresAt,
  };
};

const resolveCommercialStandCouponForSubmission = async ({
  tx,
  email,
  couponCode,
}: {
  tx: Prisma.TransactionClient;
  email: string;
  couponCode?: string;
}) => {
  if (!couponCode) {
    return null;
  }

  const normalizedCouponCode =
    normalizeCommercialDiscountCouponCode(couponCode);
  const formattedCouponCode =
    formatCommercialDiscountCouponCode(normalizedCouponCode);

  if (!normalizedCouponCode) {
    throw new HttpError(
      400,
      "INVALID_COMMERCIAL_DISCOUNT_COUPON",
      "El cupon ingresado no es valido",
    );
  }

  await expireIssuedCommercialCoupons(tx, email);

  const alreadyUsedDiscount = await tx.commercialSubmission.findFirst({
    where: getCommercialDiscountAlreadyUsedWhere(email),
    select: {
      id: true,
    },
  });

  if (alreadyUsedDiscount) {
    throw new HttpError(
      409,
      "COMMERCIAL_DISCOUNT_ALREADY_USED",
      "Ese email ya uso su descuento en una contratacion previa de stand",
    );
  }

  const coupon = await (tx as any).commercialDiscountCoupon.findUnique({
    where: {
      code: formattedCouponCode,
    },
  });

  if (!coupon || coupon.emailNormalized !== email) {
    throw new HttpError(
      400,
      "INVALID_COMMERCIAL_DISCOUNT_COUPON",
      "El cupon ingresado no es valido",
    );
  }

  if (coupon.status === "INVALIDATED") {
    throw new HttpError(
      400,
      "COMMERCIAL_DISCOUNT_COUPON_INVALIDATED",
      "Ese cupon fue invalidado por una reemision",
    );
  }

  if (coupon.status === "USED") {
    throw new HttpError(
      409,
      "COMMERCIAL_DISCOUNT_COUPON_ALREADY_USED",
      "Ese cupon ya fue usado",
    );
  }

  if (
    coupon.status === "EXPIRED" ||
    coupon.expiresAt.getTime() <= Date.now()
  ) {
    if (coupon.status === "ISSUED") {
      await (tx as any).commercialDiscountCoupon.update({
        where: {
          id: coupon.id,
        },
        data: {
          status: "EXPIRED",
        },
      });
    }

    throw new HttpError(
      400,
      "COMMERCIAL_DISCOUNT_COUPON_EXPIRED",
      "Ese cupon ya expiro",
    );
  }

  return {
    id: coupon.id,
    emailNormalized: coupon.emailNormalized,
    discountAmount: COMMERCIAL_STAND_DISCOUNT_AMOUNT,
  };
};

export {
  requestCommercialStandDiscountCoupon,
  resolveCommercialStandCouponForSubmission,
  validateCommercialStandDiscountCoupon,
};
