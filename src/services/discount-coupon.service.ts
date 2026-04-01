import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { DEFAULT_DISCOUNT_PERCENTAGE } from "../config/registration-options";
import { sendDiscountCouponEmail } from "./email.service";
import { HttpError } from "../utils/http-error";
import {
  formatDiscountCouponCode,
  generateDiscountCouponCode,
  normalizeDiscountCouponCode,
} from "../utils/discount-coupon";
import type {
  RequestDiscountCouponInput,
  RequestDiscountCouponResult,
  ValidateDiscountCouponInput,
  ValidateDiscountCouponResult,
} from "../types/submission.types";

const DISCOUNT_COUPON_EXPIRATION_MINUTES = 30;
const prismaAny = prisma as any;

const getCouponExpirationDate = () => {
  const now = new Date();
  return new Date(
    now.getTime() + DISCOUNT_COUPON_EXPIRATION_MINUTES * 60 * 1000,
  );
};

const getDiscountAlreadyUsedWhere = (email: string): Prisma.RegistrationSubmissionWhereInput => {
  return {
    discountEligibleEmailNormalized: email,
  } as Prisma.RegistrationSubmissionWhereInput;
};

const expireIssuedCoupons = async (
  tx: Prisma.TransactionClient,
  email: string,
) => {
  await (tx as any).discountCoupon.updateMany({
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

const createUniqueCouponCode = async (tx: Prisma.TransactionClient) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateDiscountCouponCode();
    const existingCoupon = await (tx as any).discountCoupon.findUnique({
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
    "DISCOUNT_COUPON_GENERATION_FAILED",
    "No se pudo generar un cupon unico",
  );
};

const requestDiscountCoupon = async ({
  email,
}: RequestDiscountCouponInput): Promise<RequestDiscountCouponResult> => {
  const eligibleParticipant =
    await prismaAny.discountEligibleParticipant.findUnique({
      where: {
        emailNormalized: email,
      },
    });

  if (!eligibleParticipant || !eligibleParticipant.isActive) {
    return {
      issued: false,
      message: "Ese email no esta habilitado para descuento.",
      expiresAt: null,
    };
  }

  const discountAlreadyUsed = await prisma.registrationSubmission.findFirst({
    where: getDiscountAlreadyUsedWhere(email),
    select: {
      id: true,
    },
  });

  if (discountAlreadyUsed) {
    return {
      issued: false,
      message: "Ese email ya uso su descuento en una inscripcion previa.",
      expiresAt: null,
    };
  }

  const issuedCoupon = await prisma.$transaction(async (tx) => {
    await expireIssuedCoupons(tx, email);

    await (tx as any).discountCoupon.updateMany({
      where: {
        emailNormalized: email,
        status: "ISSUED",
      },
      data: {
        status: "INVALIDATED",
      },
    });

    const code = await createUniqueCouponCode(tx);
    const expiresAt = getCouponExpirationDate();

    return (tx as any).discountCoupon.create({
      data: {
        code,
        emailNormalized: email,
        status: "ISSUED",
        expiresAt,
      },
    });
  });

  await sendDiscountCouponEmail({
    to: email,
    couponCode: issuedCoupon.code,
    expiresAt: issuedCoupon.expiresAt,
  });

  return {
    issued: true,
    message: "Te enviamos un cupon de descuento por email.",
    expiresAt: issuedCoupon.expiresAt,
  };
};

const validateDiscountCoupon = async ({
  email,
  couponCode,
}: ValidateDiscountCouponInput): Promise<ValidateDiscountCouponResult> => {
  const normalizedCouponCode = normalizeDiscountCouponCode(couponCode);
  const formattedCouponCode = formatDiscountCouponCode(normalizedCouponCode);

  if (!normalizedCouponCode) {
    return {
      valid: false,
      message: "El cupon ingresado no es valido.",
      discountPercentage: null,
      expiresAt: null,
    };
  }

  const alreadyUsedDiscount = await prisma.registrationSubmission.findFirst({
    where: getDiscountAlreadyUsedWhere(email),
    select: {
      id: true,
    },
  });

  if (alreadyUsedDiscount) {
    return {
      valid: false,
      message: "Ese email ya uso su descuento en una inscripcion previa.",
      discountPercentage: null,
      expiresAt: null,
    };
  }

  const coupon = await prismaAny.discountCoupon.findFirst({
    where: {
      code: formattedCouponCode,
    },
  });

  if (!coupon || coupon.emailNormalized !== email) {
    return {
      valid: false,
      message: "El cupon ingresado no es valido.",
      discountPercentage: null,
      expiresAt: null,
    };
  }

  if (coupon.status === "INVALIDATED") {
    return {
      valid: false,
      message: "Ese cupon fue invalidado por una reemision.",
      discountPercentage: null,
      expiresAt: coupon.expiresAt,
    };
  }

  if (coupon.status === "USED") {
    return {
      valid: false,
      message: "Ese cupon ya fue usado.",
      discountPercentage: null,
      expiresAt: coupon.expiresAt,
    };
  }

  if (
    coupon.status === "EXPIRED" ||
    coupon.expiresAt.getTime() <= Date.now()
  ) {
    if (coupon.status === "ISSUED") {
      await prismaAny.discountCoupon.update({
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
      discountPercentage: null,
      expiresAt: coupon.expiresAt,
    };
  }

  return {
    valid: true,
    message: "Cupon valido.",
    discountPercentage: DEFAULT_DISCOUNT_PERCENTAGE,
    expiresAt: coupon.expiresAt,
  };
};

const resolveCouponForSubmission = async ({
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

  const normalizedCouponCode = normalizeDiscountCouponCode(couponCode);
  const formattedCouponCode = formatDiscountCouponCode(normalizedCouponCode);

  if (!normalizedCouponCode) {
    throw new HttpError(
      400,
      "INVALID_DISCOUNT_COUPON",
      "El cupon ingresado no es valido",
    );
  }

  await expireIssuedCoupons(tx, email);

  const alreadyUsedDiscount = await tx.registrationSubmission.findFirst({
    where: getDiscountAlreadyUsedWhere(email),
    select: {
      id: true,
    },
  });

  if (alreadyUsedDiscount) {
    throw new HttpError(
      409,
      "DISCOUNT_ALREADY_USED",
      "Ese email ya uso su descuento en una inscripcion previa",
    );
  }

  const coupon = await (tx as any).discountCoupon.findUnique({
    where: {
      code: formattedCouponCode,
    },
  });

  if (!coupon || coupon.emailNormalized !== email) {
    throw new HttpError(
      400,
      "INVALID_DISCOUNT_COUPON",
      "El cupon ingresado no es valido",
    );
  }

  if (coupon.status === "INVALIDATED") {
    throw new HttpError(
      400,
      "DISCOUNT_COUPON_INVALIDATED",
      "Ese cupon fue invalidado por una reemision",
    );
  }

  if (coupon.status === "USED") {
    throw new HttpError(
      409,
      "DISCOUNT_COUPON_ALREADY_USED",
      "Ese cupon ya fue usado",
    );
  }

  if (
    coupon.status === "EXPIRED" ||
    coupon.expiresAt.getTime() <= Date.now()
  ) {
    if (coupon.status === "ISSUED") {
      await (tx as any).discountCoupon.update({
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
      "DISCOUNT_COUPON_EXPIRED",
      "Ese cupon ya expiro",
    );
  }

  return {
    id: coupon.id,
    emailNormalized: coupon.emailNormalized,
    discountPercentage: DEFAULT_DISCOUNT_PERCENTAGE,
  };
};

export {
  requestDiscountCoupon,
  resolveCouponForSubmission,
  validateDiscountCoupon,
};
