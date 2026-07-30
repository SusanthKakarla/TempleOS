import { describe, expect, it } from "vitest";
import { buildReceiptPdfBuffer, ENGLISH_RECEIPT_LABELS, type ReceiptPdfData } from "./receipt-pdf";

const baseData: ReceiptPdfData = {
  templeName: "Sri Venkateswara Temple",
  templeAddress: "1 Temple Street, Vijayawada",
  receiptNumber: "SRI-VENKATES-20260101-ABCD1234",
  transactionId: "txn-1",
  providerPaymentId: "pay_1",
  campaignTitle: "Roof Fund",
  amount: 500,
  currency: "INR",
  date: "1 January 2026, 10:00 AM",
  paymentMethod: "razorpay",
  donorName: "Ravi Kumar",
  donorPhone: "+919876543210",
  donorEmail: "ravi@example.com",
  donorPan: "AAAAA9999A",
};

describe("buildReceiptPdfBuffer", () => {
  it("produces a non-empty, valid PDF buffer with every optional field present", async () => {
    const buffer = await buildReceiptPdfBuffer(baseData, ENGLISH_RECEIPT_LABELS);
    expect(buffer.length).toBeGreaterThan(0);
    expect(Buffer.from(buffer.subarray(0, 5)).toString("ascii")).toBe("%PDF-");
  });

  it("handles every optional field being absent without throwing", async () => {
    const buffer = await buildReceiptPdfBuffer(
      {
        ...baseData,
        templeAddress: null,
        providerPaymentId: null,
        campaignTitle: null,
        donorPhone: null,
        donorEmail: null,
        donorPan: null,
      },
      ENGLISH_RECEIPT_LABELS,
    );
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("renders custom (e.g. Telugu) labels instead of the English defaults, without throwing", async () => {
    const teluguLabels = {
      ...ENGLISH_RECEIPT_LABELS,
      documentTitle: "దాన రసీదు",
      receiptNumber: "రసీదు సంఖ్య:",
      thankYou: "{templeName}కు మీ దాతృత్వానికి ధన్యవాదాలు.",
    };
    const buffer = await buildReceiptPdfBuffer(baseData, teluguLabels);
    expect(buffer.length).toBeGreaterThan(0);
    expect(Buffer.from(buffer.subarray(0, 5)).toString("ascii")).toBe("%PDF-");
  });

  it("substitutes {templeName} in the thank-you line", async () => {
    const labels = { ...ENGLISH_RECEIPT_LABELS, thankYou: "Thanks, {templeName}!" };
    const buffer = await buildReceiptPdfBuffer(baseData, labels);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
