import {
  CommercialKind,
  CommercialOptionCode,
  PaymentPlanType,
} from "@prisma/client";
import { HttpError } from "../utils/http-error";

type CommercialOptionDefinition = {
  code: CommercialOptionCode;
  kind: CommercialKind;
  label: string;
  totalAmount: number;
};

type CommercialPricingSummaryInput = {
  commercialKind: CommercialKind;
  commercialOptionCode: CommercialOptionCode;
  paymentPlanType: PaymentPlanType;
  applyStandDiscount?: boolean;
  referenceDate?: Date;
};

const COMMERCIAL_STAND_DISCOUNT_AMOUNT = 100000;
const COMMERCIAL_INSTALLMENTS_AVAILABLE_UNTIL = new Date(
  "2026-08-31T23:59:59.999-03:00",
);
const COMMERCIAL_INSTALLMENTS_TIMEZONE = "America/Buenos_Aires";
const COMMERCIAL_SECOND_INSTALLMENT_DUE_DAYS = 30;

const COMMERCIAL_OPTIONS: Record<
  CommercialOptionCode,
  CommercialOptionDefinition
> = {
  STAND_SPACE_3X3: {
    code: "STAND_SPACE_3X3",
    kind: "STAND",
    label: "Stand 3x3",
    totalAmount: 300000,
  },
  ADVERTISING_WEB_PAGE: {
    code: "ADVERTISING_WEB_PAGE",
    kind: "ADVERTISING",
    label: "Publicidad en página del congreso",
    totalAmount: 100000,
  },
  ADVERTISING_WEB_AND_SCREEN: {
    code: "ADVERTISING_WEB_AND_SCREEN",
    kind: "ADVERTISING",
    label: "Publicidad en página y pantalla del congreso",
    totalAmount: 150000,
  },
  ADVERTISING_BANNERS_CLIENT_PROVIDED: {
    code: "ADVERTISING_BANNERS_CLIENT_PROVIDED",
    kind: "ADVERTISING",
    label: "Publicidad en banners con banner provisto por la empresa",
    totalAmount: 200000,
  },
  ADVERTISING_BANNERS_INCLUDED_BY_CONGRESS: {
    code: "ADVERTISING_BANNERS_INCLUDED_BY_CONGRESS",
    kind: "ADVERTISING",
    label: "Publicidad en banners con banner incluido por el congreso",
    totalAmount: 300000,
  },
};

const getCommercialOption = (code: CommercialOptionCode) => {
  const option = COMMERCIAL_OPTIONS[code];

  if (!option) {
    throw new HttpError(
      400,
      "INVALID_COMMERCIAL_OPTION",
      "Invalid commercial option",
    );
  }

  return option;
};

const assertCommercialOptionMatchesKind = (
  commercialKind: CommercialKind,
  commercialOptionCode: CommercialOptionCode,
) => {
  const option = getCommercialOption(commercialOptionCode);

  if (option.kind !== commercialKind) {
    throw new HttpError(
      400,
      "INVALID_COMMERCIAL_OPTION_FOR_KIND",
      "The selected commercial option does not match the commercial kind",
    );
  }
};

const isCommercialInstallmentsAvailable = (
  referenceDate: Date = new Date(),
) => {
  return (
    referenceDate.getTime() <= COMMERCIAL_INSTALLMENTS_AVAILABLE_UNTIL.getTime()
  );
};

const getAllowedCommercialPaymentPlanTypes = (
  commercialKind: CommercialKind,
  referenceDate: Date = new Date(),
) => {
  if (isCommercialInstallmentsAvailable(referenceDate)) {
    return ["ONE_PAYMENT", "TWO_INSTALLMENTS"] satisfies PaymentPlanType[];
  }

  return ["ONE_PAYMENT"] satisfies PaymentPlanType[];
};

const getCommercialPaymentPlansCatalog = (
  commercialKind: CommercialKind,
  referenceDate: Date = new Date(),
) =>
  getAllowedCommercialPaymentPlanTypes(commercialKind, referenceDate).map(
    (paymentPlanType) => ({
      type: paymentPlanType,
      label: paymentPlanType === "TWO_INSTALLMENTS" ? "2 cuotas" : "1 pago",
      installmentCount: getCommercialInstallmentCountExpected(paymentPlanType),
    }),
  );

const assertCommercialPaymentPlanAllowed = (
  commercialKind: CommercialKind,
  paymentPlanType: PaymentPlanType,
  referenceDate: Date = new Date(),
) => {
  if (
    !getAllowedCommercialPaymentPlanTypes(
      commercialKind,
      referenceDate,
    ).includes(paymentPlanType)
  ) {
    throw new HttpError(
      400,
      "INVALID_COMMERCIAL_PAYMENT_PLAN",
      "This payment plan is not available for the selected commercial kind",
    );
  }
};

const getCommercialInstallmentCountExpected = (
  paymentPlanType: PaymentPlanType,
) => {
  return paymentPlanType === "TWO_INSTALLMENTS" ? 2 : 1;
};

const getCommercialInstallmentAmount = (
  totalAmount: number,
  paymentPlanType: PaymentPlanType,
) => {
  return paymentPlanType === "TWO_INSTALLMENTS" ? totalAmount / 2 : totalAmount;
};

const getCommercialSecondInstallmentDueAt = (
  referenceDate: Date,
  paymentPlanType: PaymentPlanType,
) => {
  if (paymentPlanType !== "TWO_INSTALLMENTS") {
    return null;
  }

  const dueAt = new Date(referenceDate);
  dueAt.setDate(dueAt.getDate() + COMMERCIAL_SECOND_INSTALLMENT_DUE_DAYS);

  return dueAt;
};

const buildCommercialPricingSummary = ({
  commercialKind,
  commercialOptionCode,
  paymentPlanType,
  applyStandDiscount = false,
  referenceDate = new Date(),
}: CommercialPricingSummaryInput) => {
  const option = getCommercialOption(commercialOptionCode);

  assertCommercialOptionMatchesKind(commercialKind, commercialOptionCode);
  assertCommercialPaymentPlanAllowed(
    commercialKind,
    paymentPlanType,
    referenceDate,
  );

  if (commercialKind === "ADVERTISING") {
    const totalAmount = option.totalAmount;

    return {
      option,
      baseAmount: option.totalAmount,
      discountAppliedAmount: 0,
      totalAmount,
      paymentPlanType,
      installmentCountExpected:
        getCommercialInstallmentCountExpected(paymentPlanType),
      installmentAmount: getCommercialInstallmentAmount(
        totalAmount,
        paymentPlanType,
      ),
      secondInstallmentDueAt: getCommercialSecondInstallmentDueAt(
        referenceDate,
        paymentPlanType,
      ),
    };
  }

  const discountAppliedAmount = applyStandDiscount
    ? COMMERCIAL_STAND_DISCOUNT_AMOUNT
    : 0;
  const totalAmount = option.totalAmount - discountAppliedAmount;

  return {
    option,
    baseAmount: option.totalAmount,
    discountAppliedAmount,
    totalAmount,
    paymentPlanType,
    installmentCountExpected:
      getCommercialInstallmentCountExpected(paymentPlanType),
    installmentAmount: getCommercialInstallmentAmount(
      totalAmount,
      paymentPlanType,
    ),
    secondInstallmentDueAt: getCommercialSecondInstallmentDueAt(
      referenceDate,
      paymentPlanType,
    ),
  };
};

const getCommercialPricingCatalog = () => {
  const standOption = COMMERCIAL_OPTIONS.STAND_SPACE_3X3;
  const advertisingOptions = Object.values(COMMERCIAL_OPTIONS).filter(
    (option) => option.kind === "ADVERTISING",
  );
  const referenceDate = new Date();

  return {
    standDiscountAmount: COMMERCIAL_STAND_DISCOUNT_AMOUNT,
    installmentsAvailable: isCommercialInstallmentsAvailable(referenceDate),
    installmentsAvailableUntil: COMMERCIAL_INSTALLMENTS_AVAILABLE_UNTIL,
    installmentsTimezone: COMMERCIAL_INSTALLMENTS_TIMEZONE,
    standOptions: [
      {
        code: standOption.code,
        label: standOption.label,
        baseAmount: standOption.totalAmount,
        discountedAmount:
          standOption.totalAmount - COMMERCIAL_STAND_DISCOUNT_AMOUNT,
        paymentPlans: getCommercialPaymentPlansCatalog(
          standOption.kind,
          referenceDate,
        ),
      },
    ],
    advertisingOptions: advertisingOptions.map((option) => ({
      code: option.code,
      label: option.label,
      totalAmount: option.totalAmount,
      paymentPlans: getCommercialPaymentPlansCatalog(
        option.kind,
        referenceDate,
      ),
    })),
  };
};

export {
  assertCommercialPaymentPlanAllowed,
  assertCommercialOptionMatchesKind,
  buildCommercialPricingSummary,
  COMMERCIAL_INSTALLMENTS_AVAILABLE_UNTIL,
  COMMERCIAL_INSTALLMENTS_TIMEZONE,
  COMMERCIAL_SECOND_INSTALLMENT_DUE_DAYS,
  COMMERCIAL_STAND_DISCOUNT_AMOUNT,
  getAllowedCommercialPaymentPlanTypes,
  getCommercialInstallmentAmount,
  getCommercialInstallmentCountExpected,
  getCommercialSecondInstallmentDueAt,
  getCommercialOption,
  getCommercialPricingCatalog,
  isCommercialInstallmentsAvailable,
};
