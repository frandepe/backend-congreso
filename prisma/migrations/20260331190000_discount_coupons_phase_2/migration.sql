-- CreateEnum
CREATE TYPE "DiscountCouponStatus" AS ENUM ('ISSUED', 'INVALIDATED', 'EXPIRED', 'USED');

-- AlterTable
ALTER TABLE "RegistrationSubmission"
ADD COLUMN     "baseAmountExpected" DECIMAL(10,2),
ADD COLUMN     "discountAppliedPercentage" INTEGER,
ADD COLUMN     "discountAppliedAmount" DECIMAL(10,2),
ADD COLUMN     "discountEligibleEmailNormalized" TEXT;

-- CreateTable
CREATE TABLE "DiscountEligibleParticipant" (
    "id" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "emailOriginal" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountEligibleParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCoupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "status" "DiscountCouponStatus" NOT NULL DEFAULT 'ISSUED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedBySubmissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscountEligibleParticipant_emailNormalized_key" ON "DiscountEligibleParticipant"("emailNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCoupon_code_key" ON "DiscountCoupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCoupon_usedBySubmissionId_key" ON "DiscountCoupon"("usedBySubmissionId");

-- CreateIndex
CREATE INDEX "DiscountCoupon_emailNormalized_createdAt_idx" ON "DiscountCoupon"("emailNormalized", "createdAt");

-- CreateIndex
CREATE INDEX "DiscountCoupon_status_idx" ON "DiscountCoupon"("status");

-- AddForeignKey
ALTER TABLE "DiscountCoupon" ADD CONSTRAINT "DiscountCoupon_usedBySubmissionId_fkey" FOREIGN KEY ("usedBySubmissionId") REFERENCES "RegistrationSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
