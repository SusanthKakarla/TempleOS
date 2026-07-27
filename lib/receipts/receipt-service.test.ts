import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadImage } from "@/lib/media/imagekit";
import { buildReceiptPdfBuffer } from "./receipt-pdf";
import { generateAndStoreReceipt } from "./receipt-service";
import type { PaymentTransaction } from "@/types/db";

vi.mock("@/lib/media/imagekit", () => ({
  uploadImage: vi.fn(),
}));
vi.mock("./receipt-pdf", () => ({
  buildReceiptPdfBuffer: vi.fn(),
}));

const transaction: PaymentTransaction = {
  id: "txn-1",
  tenantId: "tenant-1",
  paymentAccountId: "acct-1",
  campaignId: "campaign-1",
  donationId: null,
  providerKey: "razorpay",
  providerOrderId: "order_1",
  providerPaymentId: "pay_1",
  amount: 500,
  currency: "INR",
  status: "captured",
  donorName: "Ravi Kumar",
  donorPhone: "+919876543210",
  donorEmail: null,
  isAnonymous: false,
  receiptNumber: null,
  receiptUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("generateAndStoreReceipt", () => {
  beforeEach(() => {
    vi.mocked(buildReceiptPdfBuffer).mockReset();
    vi.mocked(uploadImage).mockReset();
    vi.mocked(buildReceiptPdfBuffer).mockResolvedValue(new Uint8Array([1, 2, 3]));
    vi.mocked(uploadImage).mockResolvedValue({
      fileId: "file-1",
      url: "https://ik.imagekit.io/demo/receipts/some-receipt.pdf",
      width: null,
      height: null,
      bytes: 3,
      format: "pdf",
    });
  });

  it("generates a receipt number scoped to the tenant slug and today's date", async () => {
    const result = await generateAndStoreReceipt({
      tenant: { name: "Sri Venkateswara Temple", slug: "sri-venkateswara", address: null },
      transaction,
      campaignTitle: "Roof Fund",
    });

    expect(result.receiptNumber).toMatch(/^SRI-VENKATES-\d{8}-[0-9A-F]{8}$/);
    expect(result.receiptUrl).toBe("https://ik.imagekit.io/demo/receipts/some-receipt.pdf");
  });

  it("uploads under the receipts folder with a filename matching the receipt number", async () => {
    const result = await generateAndStoreReceipt({
      tenant: { name: "Sri Venkateswara Temple", slug: "sri-venkateswara", address: null },
      transaction,
      campaignTitle: null,
    });

    expect(uploadImage).toHaveBeenCalledWith(expect.any(Buffer), "receipts", `${result.receiptNumber}.pdf`);
  });

  it("masks the donor name to 'Anonymous' in the PDF when the transaction is anonymous", async () => {
    await generateAndStoreReceipt({
      tenant: { name: "Sri Venkateswara Temple", slug: "sri-venkateswara", address: null },
      transaction: { ...transaction, isAnonymous: true },
      campaignTitle: null,
    });

    expect(buildReceiptPdfBuffer).toHaveBeenCalledWith(expect.objectContaining({ donorName: "Anonymous" }));
  });
});
