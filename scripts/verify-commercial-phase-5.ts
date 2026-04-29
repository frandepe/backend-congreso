import assert from "node:assert/strict";
import {
  buildCommercialPricingSummary,
  getAllowedCommercialPaymentPlanTypes,
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

function assertDoesNotInclude(haystack: string, needle: string, label: string) {
  assert.ok(
    !haystack.includes(needle),
    `Expected ${label} not to include "${needle}"`,
  );
}

function runPricingAssertions() {
  const catalog = getCommercialPricingCatalog();

  assert.equal(catalog.standDiscountAmount, 100000);
  assert.equal(catalog.standOptions[0]?.baseAmount, 300000);
  assert.equal(catalog.standOptions[0]?.discountedAmount, 200000);
  assert.deepEqual(
    catalog.standOptions[0]?.paymentPlans.map((plan) => plan.type),
    ["ONE_PAYMENT", "TWO_INSTALLMENTS"],
  );

  assert.equal(
    buildCommercialPricingSummary({
      commercialKind: "STAND",
      commercialOptionCode: "STAND_SPACE_3X3",
      paymentPlanType: "ONE_PAYMENT",
      applyStandDiscount: false,
    }).totalAmount,
    300000,
  );

  assert.equal(
    buildCommercialPricingSummary({
      commercialKind: "STAND",
      commercialOptionCode: "STAND_SPACE_3X3",
      paymentPlanType: "ONE_PAYMENT",
      applyStandDiscount: true,
    }).totalAmount,
    200000,
  );

  const advertisingExpectations = [
    ["ADVERTISING_WEB_PAGE", 100000],
    ["ADVERTISING_WEB_AND_SCREEN", 150000],
    ["ADVERTISING_BANNERS_CLIENT_PROVIDED", 200000],
    ["ADVERTISING_BANNERS_INCLUDED_BY_CONGRESS", 300000],
  ] as const;

  for (const [commercialOptionCode, expectedTotal] of advertisingExpectations) {
    const onePaymentResult = buildCommercialPricingSummary({
      commercialKind: "ADVERTISING",
      commercialOptionCode,
      paymentPlanType: "ONE_PAYMENT",
      applyStandDiscount: true,
    });

    assert.equal(onePaymentResult.totalAmount, expectedTotal);
    assert.equal(onePaymentResult.installmentCountExpected, 1);
    assert.equal(onePaymentResult.installmentAmount, expectedTotal);
    assert.equal(onePaymentResult.secondInstallmentDueAt, null);
    assert.equal(onePaymentResult.discountAppliedAmount, 0);

    const twoInstallmentsResult = buildCommercialPricingSummary({
      commercialKind: "ADVERTISING",
      commercialOptionCode,
      paymentPlanType: "TWO_INSTALLMENTS",
      applyStandDiscount: true,
      referenceDate: new Date("2026-04-01T12:00:00.000-03:00"),
    });

    assert.equal(twoInstallmentsResult.totalAmount, expectedTotal);
    assert.equal(twoInstallmentsResult.installmentCountExpected, 2);
    assert.equal(twoInstallmentsResult.installmentAmount, expectedTotal / 2);
    assert.ok(twoInstallmentsResult.secondInstallmentDueAt instanceof Date);
    assert.equal(twoInstallmentsResult.discountAppliedAmount, 0);
  }

  for (const option of catalog.advertisingOptions) {
    assert.deepEqual(
      option.paymentPlans.map((plan) => plan.type),
      ["ONE_PAYMENT", "TWO_INSTALLMENTS"],
    );
  }

  assert.deepEqual(
    getAllowedCommercialPaymentPlanTypes(
      "ADVERTISING",
      new Date("2026-09-01T00:00:00.000-03:00"),
    ),
    ["ONE_PAYMENT"],
  );

  assert.throws(() =>
    buildCommercialPricingSummary({
      commercialKind: "ADVERTISING",
      commercialOptionCode: "ADVERTISING_WEB_PAGE",
      paymentPlanType: "TWO_INSTALLMENTS",
      referenceDate: new Date("2026-09-01T00:00:00.000-03:00"),
    }),
  );

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
    totalAmountExpected: 200000,
    installmentAmountExpected: 100000,
    discountAppliedAmount: 100000,
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
    "/inscripcion/comercial/segunda-cuota",
    "commercial confirmation email",
  );
  assertIncludes(
    submissionHtml,
    "/catalogos-livings",
    "commercial confirmation email",
  );
  assertIncludes(
    submissionHtml,
    "Ver opciones de livings y equipamiento",
    "commercial confirmation email",
  );
  assertIncludes(
    submissionHtml,
    "Ir a segunda cuota comercial",
    "commercial confirmation email",
  );
  assertDoesNotInclude(
    submissionHtml,
    "/inscripcion/expositores/segunda-cuota",
    "commercial confirmation email",
  );

  const advertisingSubmissionHtml = buildCommercialSubmissionConfirmationEmailHtml({
    trackingCode: "COM-000456",
    commercialKindLabel: "Publicidad",
    commercialOptionLabel: "Publicidad en pagina del congreso",
    companyName: "Empresa Publicidad",
    paymentPlanLabel: "2 cuotas",
    totalAmountExpected: 100000,
    installmentAmountExpected: 50000,
    discountAppliedAmount: null,
    secondInstallmentDueAt: new Date("2026-05-01T12:00:00.000Z"),
  });

  assertIncludes(
    advertisingSubmissionHtml,
    "Publicidad",
    "advertising confirmation email",
  );
  assertIncludes(
    advertisingSubmissionHtml,
    "Ir a segunda cuota comercial",
    "advertising confirmation email",
  );
  assertIncludes(
    advertisingSubmissionHtml,
    "/inscripcion/comercial/segunda-cuota",
    "advertising confirmation email",
  );
  assertDoesNotInclude(
    advertisingSubmissionHtml,
    "/catalogos-livings",
    "advertising confirmation email",
  );
  assertDoesNotInclude(
    advertisingSubmissionHtml,
    "Descuento aplicado",
    "advertising confirmation email",
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
        equipmentAdditionalAmount: null,
        includesEquipment: false,
        discountAppliedAmount: 100000,
        discountCouponCode: "STAND-ABC123",
        discountEligibleEmailNormalized: "frandepaulo@yahoo.com.ar",
        totalAmountExpected: 200000,
        paymentPlanType: "TWO_INSTALLMENTS",
        installmentCountExpected: 2,
        installmentAmountExpected: 100000,
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
      {
        id: "commercial-submission-2",
        createdAt: "2026-04-02T12:00:00.000Z",
        updatedAt: "2026-04-02T13:00:00.000Z",
        reviewedAt: "2026-04-02T14:00:00.000Z",
        status: "PENDING_REVIEW",
        commercialKind: "ADVERTISING",
        commercialOptionCode: "ADVERTISING_WEB_PAGE",
        companyName: "Empresa Publicidad",
        contactFirstName: "Luis",
        contactLastName: "Gomez",
        email: "publicidad@empresa.com",
        phone: "654321",
        websiteOrSocialUrl: "https://empresa.example",
        currencyCode: "ARS",
        baseAmountExpected: 100000,
        equipmentAdditionalAmount: null,
        includesEquipment: false,
        discountAppliedAmount: null,
        discountCouponCode: null,
        discountEligibleEmailNormalized: null,
        totalAmountExpected: 100000,
        paymentPlanType: "TWO_INSTALLMENTS",
        installmentCountExpected: 2,
        installmentAmountExpected: 50000,
        secondInstallmentDueAt: "2026-05-02T12:00:00.000Z",
        secondInstallmentExpired: false,
        notes: "Publicidad",
        internalNote: "Revisar publicidad",
        reviewedByAdmin: {
          id: "admin-1",
          email: "admin@congreso.com",
        },
        receipts: [
          {
            id: "receipt-2",
            installmentNumber: 1,
            amountReported: 50000,
            paymentDate: "2026-04-02T00:00:00.000Z",
            status: "APPROVED",
            rejectionReason: null,
            reviewedAt: "2026-04-02T14:00:00.000Z",
            reviewedByAdminEmail: "admin@congreso.com",
            receiptUrl: "https://example.com/advertising-receipt-1.pdf",
            receiptOriginalFilename: "advertising-receipt-1.pdf",
            receiptMimeType: "application/pdf",
            receiptSizeBytes: 123456,
          },
          {
            id: "receipt-3",
            installmentNumber: 2,
            amountReported: 50000,
            paymentDate: "2026-04-20T00:00:00.000Z",
            status: "PENDING_REVIEW",
            rejectionReason: null,
            reviewedAt: null,
            reviewedByAdminEmail: undefined,
            receiptUrl: "https://example.com/advertising-receipt-2.pdf",
            receiptOriginalFilename: "advertising-receipt-2.pdf",
            receiptMimeType: "application/pdf",
            receiptSizeBytes: 234567,
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
  assertIncludes(workbookXml, "Publicidad", "workbook xml");
  assertIncludes(workbookXml, "ADVERTISING_WEB_PAGE", "workbook xml");
  assertIncludes(workbookXml, "https://example.com/advertising-receipt-2.pdf", "workbook xml");
  assertIncludes(workbookXml, ">2</Data>", "workbook xml");
}

runPricingAssertions();
runEmailAssertions();
runWorkbookAssertions();

console.log("Phase 5 commercial QA verification passed.");
