-- CreateEnum
CREATE TYPE "CommercialKind" AS ENUM ('STAND', 'ADVERTISING');

-- CreateEnum
CREATE TYPE "CommercialOptionCode" AS ENUM (
    'STAND_SPACE_3X3',
    'ADVERTISING_WEB_PAGE',
    'ADVERTISING_WEB_AND_SCREEN',
    'ADVERTISING_BANNERS_CLIENT_PROVIDED',
    'ADVERTISING_BANNERS_INCLUDED_BY_CONGRESS'
);

-- CreateTable
CREATE TABLE "CommercialSubmission" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactFirstName" TEXT NOT NULL,
    "contactLastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "commercialKind" "CommercialKind" NOT NULL,
    "commercialOptionCode" "CommercialOptionCode" NOT NULL,
    "commercialOptionLabelSnapshot" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'ARS',
    "baseAmountExpected" DECIMAL(10,2) NOT NULL,
    "equipmentAdditionalAmount" DECIMAL(10,2),
    "discountAppliedAmount" DECIMAL(10,2),
    "discountEligibleEmailNormalized" TEXT,
    "totalAmountExpected" DECIMAL(10,2) NOT NULL,
    "includesEquipment" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "internalNote" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialDiscountEligibleExhibitor" (
    "id" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "emailOriginal" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialDiscountEligibleExhibitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialDiscountCoupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "status" "DiscountCouponStatus" NOT NULL DEFAULT 'ISSUED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedByCommercialSubmissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialDiscountCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialPaymentReceipt" (
    "id" TEXT NOT NULL,
    "commercialSubmissionId" TEXT NOT NULL,
    "amountReported" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "receiptUrl" TEXT NOT NULL,
    "receiptPublicId" TEXT NOT NULL,
    "receiptOriginalFilename" TEXT,
    "receiptMimeType" TEXT,
    "receiptSizeBytes" INTEGER,
    "status" "PaymentReceiptStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialPaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommercialSubmission_commercialKind_idx" ON "CommercialSubmission"("commercialKind");

-- CreateIndex
CREATE INDEX "CommercialSubmission_commercialOptionCode_idx" ON "CommercialSubmission"("commercialOptionCode");

-- CreateIndex
CREATE INDEX "CommercialSubmission_status_idx" ON "CommercialSubmission"("status");

-- CreateIndex
CREATE INDEX "CommercialSubmission_createdAt_idx" ON "CommercialSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "CommercialSubmission_email_idx" ON "CommercialSubmission"("email");

-- CreateIndex
CREATE INDEX "CommercialSubmission_status_createdAt_idx" ON "CommercialSubmission"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialDiscountEligibleExhibitor_emailNormalized_key" ON "CommercialDiscountEligibleExhibitor"("emailNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialDiscountCoupon_code_key" ON "CommercialDiscountCoupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialDiscountCoupon_usedByCommercialSubmissionId_key" ON "CommercialDiscountCoupon"("usedByCommercialSubmissionId");

-- CreateIndex
CREATE INDEX "CommercialDiscountCoupon_emailNormalized_createdAt_idx" ON "CommercialDiscountCoupon"("emailNormalized", "createdAt");

-- CreateIndex
CREATE INDEX "CommercialDiscountCoupon_status_idx" ON "CommercialDiscountCoupon"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialPaymentReceipt_commercialSubmissionId_key" ON "CommercialPaymentReceipt"("commercialSubmissionId");

-- CreateIndex
CREATE INDEX "CommercialPaymentReceipt_status_idx" ON "CommercialPaymentReceipt"("status");

-- AddForeignKey
ALTER TABLE "CommercialSubmission" ADD CONSTRAINT "CommercialSubmission_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialDiscountCoupon" ADD CONSTRAINT "CommercialDiscountCoupon_usedByCommercialSubmissionId_fkey" FOREIGN KEY ("usedByCommercialSubmissionId") REFERENCES "CommercialSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialPaymentReceipt" ADD CONSTRAINT "CommercialPaymentReceipt_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialPaymentReceipt" ADD CONSTRAINT "CommercialPaymentReceipt_commercialSubmissionId_fkey" FOREIGN KEY ("commercialSubmissionId") REFERENCES "CommercialSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CommercialDiscountEligibleExhibitor" (
  "id",
  "emailNormalized",
  "emailOriginal",
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES
  (
    'commercial_discount_eligible_frandepaulo_yahoo_com_ar',
    'frandepaulo@yahoo.com.ar',
    'frandepaulo@yahoo.com.ar',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'commercial_discount_eligible_strongert1_hotmail_com',
    'strongert1@hotmail.com',
    'strongert1@hotmail.com',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("emailNormalized")
DO UPDATE SET
  "emailOriginal" = EXCLUDED."emailOriginal",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
