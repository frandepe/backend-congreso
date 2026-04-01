INSERT INTO "DiscountEligibleParticipant" (
  "id",
  "emailNormalized",
  "emailOriginal",
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES
  (
    'discount_eligible_ndcapacitaciones_gmail_com',
    'ndcapacitaciones@gmail.com',
    'ndcapacitaciones@gmail.com',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'discount_eligible_frandepaulo23_gmail_com',
    'frandepaulo23@gmail.com',
    'frandepaulo23@gmail.com',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'discount_eligible_sof_riesgos_gmail_com',
    'sof.riesgos@gmail.com',
    'sof.riesgos@gmail.com',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'discount_eligible_carranzalh_gmail_com',
    'carranzalh@gmail.com',
    'carranzalh@gmail.com',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("emailNormalized")
DO UPDATE SET
  "emailOriginal" = EXCLUDED."emailOriginal",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
