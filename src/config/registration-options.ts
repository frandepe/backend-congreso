import { PaymentPlanType, RegistrationOptionCode } from "@prisma/client";
import { HttpError } from "../utils/http-error";

type RegistrationOptionDefinition = {
  code: RegistrationOptionCode;
  label: string;
  totalAmountExpected: number;
};

type PaymentPlanDefinition = {
  type: PaymentPlanType;
  label: string;
};

type PricingSummaryInput = {
  registrationOptionCode: RegistrationOptionCode;
  paymentPlanType: PaymentPlanType;
  discountPercentage?: number;
  referenceDate?: Date;
};

const DEFAULT_DISCOUNT_PERCENTAGE = 20;
const INSTALLMENTS_AVAILABLE_UNTIL = new Date(
  "2026-08-31T23:59:59.999-03:00",
);
const INSTALLMENTS_TIMEZONE = "America/Buenos_Aires";
const SECOND_INSTALLMENT_DUE_DAYS = 30;

const REGISTRATION_OPTIONS: Record<
  RegistrationOptionCode,
  RegistrationOptionDefinition
> = {
  ONE_DAY: {
    code: "ONE_DAY",
    label: "1 dia",
    totalAmountExpected: 15000,
  },
  THREE_DAYS: {
    code: "THREE_DAYS",
    label: "3 dias",
    totalAmountExpected: 40000,
  },
  THREE_DAYS_WITH_LODGING: {
    code: "THREE_DAYS_WITH_LODGING",
    label: "3 dias con alojamiento",
    totalAmountExpected: 70000,
  },
};

const PAYMENT_PLAN_DEFINITIONS: Record<PaymentPlanType, PaymentPlanDefinition> = {
  ONE_PAYMENT: {
    type: "ONE_PAYMENT",
    label: "1 pago",
  },
  TWO_INSTALLMENTS: {
    type: "TWO_INSTALLMENTS",
    label: "2 cuotas",
  },
};

const ALLOWED_PAYMENT_PLANS_BY_OPTION: Record<
  RegistrationOptionCode,
  PaymentPlanType[]
> = {
  ONE_DAY: ["ONE_PAYMENT"],
  THREE_DAYS: ["ONE_PAYMENT", "TWO_INSTALLMENTS"],
  THREE_DAYS_WITH_LODGING: ["ONE_PAYMENT", "TWO_INSTALLMENTS"],
};

const getRegistrationOption = (
  code: RegistrationOptionCode,
): RegistrationOptionDefinition => {
  const option = REGISTRATION_OPTIONS[code];

  if (!option) {
    throw new HttpError(
      400,
      "INVALID_REGISTRATION_OPTION",
      "Invalid registration option",
    );
  }

  return option;
};

const getPaymentPlanDefinition = (
  paymentPlanType: PaymentPlanType,
): PaymentPlanDefinition => {
  const paymentPlanDefinition = PAYMENT_PLAN_DEFINITIONS[paymentPlanType];

  if (!paymentPlanDefinition) {
    throw new HttpError(
      400,
      "INVALID_PAYMENT_PLAN_TYPE",
      "Invalid payment plan type",
    );
  }

  return paymentPlanDefinition;
};

const isInstallmentsAvailable = (referenceDate: Date = new Date()) => {
  return referenceDate.getTime() <= INSTALLMENTS_AVAILABLE_UNTIL.getTime();
};

const getAllowedPaymentPlanTypes = (
  registrationOptionCode: RegistrationOptionCode,
  referenceDate: Date = new Date(),
) => {
  const paymentPlans = ALLOWED_PAYMENT_PLANS_BY_OPTION[registrationOptionCode] ?? [];

  if (isInstallmentsAvailable(referenceDate)) {
    return paymentPlans;
  }

  return paymentPlans.filter((paymentPlanType) => paymentPlanType !== "TWO_INSTALLMENTS");
};

const getInstallmentsAllowedForOption = (
  registrationOptionCode: RegistrationOptionCode,
  referenceDate: Date = new Date(),
) => {
  return getAllowedPaymentPlanTypes(registrationOptionCode, referenceDate).includes(
    "TWO_INSTALLMENTS",
  );
};

const isPaymentPlanAllowedForOption = (
  registrationOptionCode: RegistrationOptionCode,
  paymentPlanType: PaymentPlanType,
  referenceDate: Date = new Date(),
) => {
  return getAllowedPaymentPlanTypes(registrationOptionCode, referenceDate).includes(
    paymentPlanType,
  );
};

const assertPaymentPlanAllowedForOption = (
  registrationOptionCode: RegistrationOptionCode,
  paymentPlanType: PaymentPlanType,
  referenceDate: Date = new Date(),
) => {
  if (
    !isPaymentPlanAllowedForOption(
      registrationOptionCode,
      paymentPlanType,
      referenceDate,
    )
  ) {
    throw new HttpError(
      400,
      "INVALID_PAYMENT_PLAN_FOR_OPTION",
      "This payment plan is not available for the selected registration option",
    );
  }
};

const getInstallmentCountExpected = (
  paymentPlanType: PaymentPlanType,
): number => {
  return paymentPlanType === "TWO_INSTALLMENTS" ? 2 : 1;
};

const getExpectedInstallmentAmount = (
  totalAmountExpected: number,
  paymentPlanType: PaymentPlanType,
): number => {
  return paymentPlanType === "TWO_INSTALLMENTS"
    ? totalAmountExpected / 2
    : totalAmountExpected;
};

const getSecondInstallmentDueAt = (
  referenceDate: Date,
  paymentPlanType: PaymentPlanType,
) => {
  if (paymentPlanType !== "TWO_INSTALLMENTS") {
    return null;
  }

  const dueAt = new Date(referenceDate);
  dueAt.setDate(dueAt.getDate() + SECOND_INSTALLMENT_DUE_DAYS);

  return dueAt;
};

const getDiscountAmount = (
  totalAmountExpected: number,
  discountPercentage: number,
) => {
  return Number(
    ((totalAmountExpected * discountPercentage) / 100).toFixed(2),
  );
};

const buildPricingSummary = ({
  registrationOptionCode,
  paymentPlanType,
  discountPercentage = 0,
  referenceDate = new Date(),
}: PricingSummaryInput) => {
  assertPaymentPlanAllowedForOption(
    registrationOptionCode,
    paymentPlanType,
    referenceDate,
  );

  const registrationOption = getRegistrationOption(registrationOptionCode);
  const discountAppliedAmount = getDiscountAmount(
    registrationOption.totalAmountExpected,
    discountPercentage,
  );
  const finalTotalAmount = Number(
    (registrationOption.totalAmountExpected - discountAppliedAmount).toFixed(2),
  );

  return {
    registrationOption,
    paymentPlan: getPaymentPlanDefinition(paymentPlanType),
    discountPercentage,
    discountAppliedAmount,
    finalTotalAmount,
    installmentsAllowed: getInstallmentsAllowedForOption(
      registrationOptionCode,
      referenceDate,
    ),
    installmentCountExpected: getInstallmentCountExpected(paymentPlanType),
    installmentAmount: getExpectedInstallmentAmount(
      finalTotalAmount,
      paymentPlanType,
    ),
    secondInstallmentDueAt: getSecondInstallmentDueAt(
      referenceDate,
      paymentPlanType,
    ),
  };
};

export {
  assertPaymentPlanAllowedForOption,
  buildPricingSummary,
  DEFAULT_DISCOUNT_PERCENTAGE,
  getExpectedInstallmentAmount,
  getInstallmentCountExpected,
  getInstallmentsAllowedForOption,
  getAllowedPaymentPlanTypes,
  getSecondInstallmentDueAt,
  INSTALLMENTS_AVAILABLE_UNTIL,
  INSTALLMENTS_TIMEZONE,
  SECOND_INSTALLMENT_DUE_DAYS,
  getPaymentPlanDefinition,
  getRegistrationOption,
  isInstallmentsAvailable,
  isPaymentPlanAllowedForOption,
};
