-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "RegistrationOptionCode" AS ENUM ('ONE_DAY', 'THREE_DAYS', 'THREE_DAYS_WITH_LODGING');

-- CreateEnum
CREATE TYPE "PaymentPlanType" AS ENUM ('ONE_PAYMENT', 'TWO_INSTALLMENTS');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING_REVIEW', 'PARTIALLY_PAID', 'FULLY_PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentReceiptStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationSubmission" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "registrationOptionCode" "RegistrationOptionCode" NOT NULL,
    "registrationOptionLabelSnapshot" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'ARS',
    "totalAmountExpected" DECIMAL(10,2) NOT NULL,
    "paymentPlanType" "PaymentPlanType" NOT NULL,
    "installmentCountExpected" INTEGER NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "notes" TEXT,
    "internalNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReceiptSubmission" (
    "id" TEXT NOT NULL,
    "registrationSubmissionId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
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

    CONSTRAINT "PaymentReceiptSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "RegistrationSubmission_status_idx" ON "RegistrationSubmission"("status");

-- CreateIndex
CREATE INDEX "RegistrationSubmission_createdAt_idx" ON "RegistrationSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "RegistrationSubmission_dni_idx" ON "RegistrationSubmission"("dni");

-- CreateIndex
CREATE INDEX "RegistrationSubmission_email_idx" ON "RegistrationSubmission"("email");

-- CreateIndex
CREATE INDEX "RegistrationSubmission_registrationOptionCode_idx" ON "RegistrationSubmission"("registrationOptionCode");

-- CreateIndex
CREATE INDEX "RegistrationSubmission_status_createdAt_idx" ON "RegistrationSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentReceiptSubmission_registrationSubmissionId_idx" ON "PaymentReceiptSubmission"("registrationSubmissionId");

-- CreateIndex
CREATE INDEX "PaymentReceiptSubmission_status_idx" ON "PaymentReceiptSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceiptSubmission_registrationSubmissionId_installme_key" ON "PaymentReceiptSubmission"("registrationSubmissionId", "installmentNumber");

-- AddForeignKey
ALTER TABLE "RegistrationSubmission" ADD CONSTRAINT "RegistrationSubmission_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceiptSubmission" ADD CONSTRAINT "PaymentReceiptSubmission_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceiptSubmission" ADD CONSTRAINT "PaymentReceiptSubmission_registrationSubmissionId_fkey" FOREIGN KEY ("registrationSubmissionId") REFERENCES "RegistrationSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
