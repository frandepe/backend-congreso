-- AlterTable
ALTER TABLE "RegistrationSubmission"
ADD COLUMN     "installmentsAllowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "installmentAmountExpected" DECIMAL(10,2);
