import { PaymentPlanType, RegistrationOptionCode } from "@prisma/client";
import { HttpError } from "../utils/http-error";

type RegistrationOptionDefinition = {
  code: RegistrationOptionCode;
  label: string;
  totalAmountExpected: number;
};

const REGISTRATION_OPTIONS: Record<
  RegistrationOptionCode,
  RegistrationOptionDefinition
> = {
  ONE_DAY: {
    code: "ONE_DAY",
    label: "1 dia",
    totalAmountExpected: 40000,
  },
  THREE_DAYS: {
    code: "THREE_DAYS",
    label: "3 dias",
    totalAmountExpected: 50000,
  },
  THREE_DAYS_WITH_LODGING: {
    code: "THREE_DAYS_WITH_LODGING",
    label: "3 dias con alojamiento",
    totalAmountExpected: 60000,
  },
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

const getInstallmentCountExpected = (paymentPlanType: PaymentPlanType): number => {
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

export {
  getExpectedInstallmentAmount,
  getInstallmentCountExpected,
  getRegistrationOption,
};
