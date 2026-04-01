import assert from "node:assert/strict";
import {
  buildCommercialPricingSummary,
  getCommercialPricingCatalog,
} from "../src/config/commercial-options";
import {
  buildCommercialStandDiscountCouponEmailHtml,
  buildCommercialSubmissionConfirmationEmailHtml,
} from "../src/services/email.service";
import { buildAdminCommercialWorkbookXml } from "../../react-congreso-2025/src/features/admin-commercial-submissions/admin-commercial-submissions.export-core";

function assertIncludes(haystack: string, needle: string, label: string) {
  assert.ok(
    haystack.includes(needle),
    `Expected ${label} to include "${needle}"`,
  );
}

function runPricingAssertions() {
  const catalog = getCommercialPricingCatalog();

  assert.equal(catalog.standDiscountAmount, 100000);
  assert.equal(catalog.standEquipmentAdditionalAmount, 150000);
  assert.equal(catalog.standOptions[0]?.baseAmount, 300000);
  assert.equal(catalog.standOptions[0]?.discountedAmount, 200000);

  assert.equal(
    buildCommercialPricingSummary({
      commercialKind: "STAND",
      commercialOptionCode: "STAND_SPACE_3X3",
      paymentPlanType: "ONE_PAYMENT",
      includesEquipment: false,
      applyStandDiscount: false,
    }).totalAmount,
    300000,
  );

  assert.equal(
    buildCommercialPricingSummary({
      commercialKind: "STAND",
      commercialOptionCode: "STAND_SPACE_3X3",
      paymentPlanType: "ONE_PAYMENT",
      includesEquipment: true,
      applyStandDiscount: false,
    }).totalAmount,
    450000,
  );

  assert.equal(
    buildCommercialPricingSummary({
      commercialKind: "STAND",
      commercialOptionCode: "STAND_SPACE_3X3",
      paymentPlanType: "ONE_PAYMENT",
      includesEquipment: false,
      applyStandDiscount: true,
    }).totalAmount,
    200000,
  );

  assert.equal(
    buildCommercialPricingSummary({
      commercialKind: "STAND",
      commercialOptionCode: "STAND_SPACE_3X3",
      paymentPlanType: "ONE_PAYMENT",
      includesEquipment: true,
      applyStandDiscount: true,
    }).totalAmount,
    350000,
  );

  const advertisingExpectations = [
    ["ADVERTISING_WEB_PAGE", 100000],
    ["ADVERTISING_WEB_AND_SCREEN", 150000],
    ["ADVERTISING_BANNERS_CLIENT_PROVIDED", 200000],
    ["ADVERTISING_BANNERS_INCLUDED_BY_CONGRESS", 300000],
  ] as const;

  for (const [commercialOptionCode, expectedTotal] of advertisingExpectations) {
    const result = buildCommercialPricingSummary({
      commercialKind: "ADVERTISING",
      commercialOptionCode,
      paymentPlanType: "ONE_PAYMENT",
      includesEquipment: true,
      applyStandDiscount: true,
    });

    assert.equal(result.totalAmount, expectedTotal);
    assert.equal(result.discountAppliedAmount, 0);
    assert.equal(result.equipmentAdditionalAmount, 0);
  }

  assert.throws(() =>
    buildCommercialPricingSummary({
      commercialKind: "ADVERTISING",
      commercialOptionCode: "STAND_SPACE_3X3",
      paymentPlanType: "ONE_PAYMENT",
    }),
  );
}

function runEmailAssertions() {
  const submissionHtml = buildCommercialSubmissionConfirmationEmailHtml({
    trackingCode: "COM-000123",
    commercialKindLabel: "Stand",
    commercialOptionLabel: "Stand 3x3",
    companyName: "Empresa Demo",
    paymentPlanLabel: "2 cuotas",
    totalAmountExpected: 350000,
    installmentAmountExpected: 175000,
    discountAppliedAmount: 100000,
    equipmentAdditionalAmount: 150000,
    secondInstallmentDueAt: new Date("2026-05-01T12:00:00.000Z"),
  });

  assertIncludes(
    submissionHtml,
    "COM-000123",
    "commercial confirmation email",
  );
  assertIncludes(
    submissionHtml,
    "Empresa Demo",
    "commercial confirmation email",
  );
  assertIncludes(
    submissionHtml,
    "Descuento aplicado",
    "commercial confirmation email",
  );
  assertIncludes(
    submissionHtml,
    "Adicional equipamiento",
    "commercial confirmation email",
  );

  const couponHtml = buildCommercialStandDiscountCouponEmailHtml({
    couponCode: "STAND-ABC123",
    expiresAt: new Date("2026-04-30T12:00:00.000Z"),
  });

  assertIncludes(couponHtml, "STAND-ABC123", "stand coupon email");
  assertIncludes(
    couponHtml,
    "/inscripcion/expositores",
    "stand coupon email",
  );
  assertIncludes(
    couponHtml,
    "Descuento para expositores",
    "stand coupon email",
  );
}

function runWorkbookAssertions() {
  const workbookXml = buildAdminCommercialWorkbookXml(
    [
      {
        id: "commercial-submission-1",
        createdAt: "2026-04-01T12:00:00.000Z",
        updatedAt: "2026-04-01T13:00:00.000Z",
        reviewedAt: "2026-04-01T14:00:00.000Z",
        status: "PENDING_REVIEW",
        commercialKind: "STAND",
        commercialOptionCode: "STAND_SPACE_3X3",
        companyName: "Empresa Demo",
        contactFirstName: "Ana",
        contactLastName: "Perez",
        email: "ana@empresa.com",
        phone: "123456",
        currencyCode: "ARS",
        baseAmountExpected: 300000,
        equipmentAdditionalAmount: 150000,
        includesEquipment: true,
        discountAppliedAmount: 100000,
        discountCouponCode: "STAND-ABC123",
        discountEligibleEmailNormalized: "frandepaulo@yahoo.com.ar",
        totalAmountExpected: 350000,
        paymentPlanType: "TWO_INSTALLMENTS",
        installmentCountExpected: 2,
        installmentAmountExpected: 175000,
        secondInstallmentDueAt: "2026-05-01T12:00:00.000Z",
        secondInstallmentExpired: false,
        notes: "Notas",
        internalNote: "Revisar",
        reviewedByAdmin: {
          id: "admin-1",
          email: "admin@congreso.com",
        },
        receipts: [
          {
            id: "receipt-1",
            installmentNumber: 1,
            amountReported: 175000,
            paymentDate: "2026-03-30T00:00:00.000Z",
            status: "APPROVED",
            rejectionReason: null,
            reviewedAt: "2026-04-01T14:00:00.000Z",
            reviewedByAdminEmail: "admin@congreso.com",
            receiptUrl: "https://example.com/receipt.pdf",
            receiptOriginalFilename: "receipt.pdf",
            receiptMimeType: "application/pdf",
            receiptSizeBytes: 123456,
          },
        ],
      },
    ] as any,
    "2026-04-01 15:00:00",
  );

  assertIncludes(workbookXml, 'Worksheet ss:Name="Solicitudes"', "workbook xml");
  assertIncludes(workbookXml, 'Worksheet ss:Name="Comprobantes"', "workbook xml");
  assertIncludes(workbookXml, "Cupon descuento", "workbook xml");
  assertIncludes(workbookXml, "STAND-ABC123", "workbook xml");
  assertIncludes(workbookXml, "URL comprobante", "workbook xml");
  assertIncludes(workbookXml, "https://example.com/receipt.pdf", "workbook xml");
}

runPricingAssertions();
runEmailAssertions();
runWorkbookAssertions();

console.log("Phase 5 commercial QA verification passed.");
