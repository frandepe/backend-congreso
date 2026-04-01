DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'CommercialPaymentReceipt'
      AND column_name = 'installmentNumber'
  ) THEN
    ALTER TABLE "CommercialPaymentReceipt"
    ALTER COLUMN "installmentNumber" DROP DEFAULT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'CommercialPaymentReceipt_commercialSubmissionId_installmentNumb'
  ) THEN
    ALTER INDEX "CommercialPaymentReceipt_commercialSubmissionId_installmentNumb"
    RENAME TO "CommercialPaymentReceipt_commercialSubmissionId_installment_key";
  END IF;
END $$;
