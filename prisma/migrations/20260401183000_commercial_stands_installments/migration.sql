ALTER TABLE "CommercialSubmission"
ADD COLUMN "paymentPlanType" "PaymentPlanType" NOT NULL DEFAULT 'ONE_PAYMENT',
ADD COLUMN "installmentCountExpected" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "installmentAmountExpected" DECIMAL(10,2),
ADD COLUMN "secondInstallmentDueAt" TIMESTAMP(3);

UPDATE "CommercialSubmission"
SET "installmentAmountExpected" = "totalAmountExpected"
WHERE "installmentAmountExpected" IS NULL;

ALTER TABLE "CommercialPaymentReceipt"
ADD COLUMN "installmentNumber" INTEGER NOT NULL DEFAULT 1;

DROP INDEX IF EXISTS "CommercialPaymentReceipt_commercialSubmissionId_key";

CREATE UNIQUE INDEX "CommercialPaymentReceipt_commercialSubmissionId_installmentNumber_key"
ON "CommercialPaymentReceipt"("commercialSubmissionId", "installmentNumber");

CREATE INDEX "CommercialPaymentReceipt_commercialSubmissionId_idx"
ON "CommercialPaymentReceipt"("commercialSubmissionId");
