import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTenantById } from "@/lib/db/tenants";
import { getCampaignById } from "@/lib/db/campaigns";
import { createDonation } from "@/lib/db/donations";
import { listActiveAdminPersonIdsForTenant } from "@/lib/db/tenant-memberships";
import {
  attachDonationAndReceipt,
  getPaymentTransactionById,
  getTransactionByProviderOrderId,
  markTransactionCapturedIfNotAlready,
} from "@/lib/db/payment-transactions";
import { generateAndStoreReceipt } from "@/lib/receipts/receipt-service";
import { enqueueNotification } from "@/lib/notifications/engine";
import { processNotifications } from "@/lib/notifications/delivery";
import { applyPaymentEvent } from "./campaign-payment-service";
import { PaymentAuditService } from "./payment-audit";
import type { PaymentTransaction, Tenant } from "@/types/db";

vi.mock("@/lib/db/tenants", () => ({ getTenantById: vi.fn() }));
vi.mock("@/lib/db/campaigns", () => ({ getCampaignById: vi.fn() }));
vi.mock("@/lib/db/donations", () => ({ createDonation: vi.fn() }));
vi.mock("@/lib/db/tenant-memberships", () => ({ listActiveAdminPersonIdsForTenant: vi.fn() }));
vi.mock("@/lib/db/payment-transactions", () => ({
  attachDonationAndReceipt: vi.fn(),
  getPaymentTransactionById: vi.fn(),
  getTransactionByProviderOrderId: vi.fn(),
  getTransactionByProviderPaymentId: vi.fn(),
  markTransactionCapturedIfNotAlready: vi.fn(),
  updateTransactionStatus: vi.fn(),
}));
vi.mock("@/lib/db/payment-refunds", () => ({ upsertRefundStatusFromWebhook: vi.fn() }));
vi.mock("@/lib/receipts/receipt-service", () => ({ generateAndStoreReceipt: vi.fn() }));
vi.mock("@/lib/notifications/engine", () => ({ enqueueNotification: vi.fn() }));
vi.mock("@/lib/notifications/delivery", () => ({ processNotifications: vi.fn() }));
vi.mock("./payment-audit", () => ({
  PaymentAuditService: {
    transactionCaptured: vi.fn(),
    transactionFailed: vi.fn(),
    transactionRefunded: vi.fn(),
    refundFailed: vi.fn(),
  },
}));

const tenant: Tenant = {
  id: "tenant-1",
  slug: "sri-temple",
  name: "Sri Temple",
  status: "active",
  defaultContactPhone: null,
  address: null,
  timezone: "Asia/Kolkata",
  welcomeMessage: null,
  description: null,
  history: null,
  contactEmail: null,
  googleMapsLink: null,
  morningOpen: null,
  morningClose: null,
  eveningOpen: null,
  eveningClose: null,
  donationInfo: null,
  notifyOnNewEvent: false,
  notifyOnEventUpdated: false,
  notifyOnEventCancelled: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeTransaction(overrides: Partial<PaymentTransaction> = {}): PaymentTransaction {
  return {
    id: "txn-1",
    tenantId: "tenant-1",
    paymentAccountId: "acct-1",
    campaignId: null,
    donationId: null,
    providerKey: "razorpay",
    providerOrderId: "order_1",
    providerPaymentId: "pay_1",
    amount: 501,
    currency: "INR",
    status: "captured",
    donorName: "Ravi Kumar",
    donorPhone: "+919876543210",
    donorEmail: null,
    donorPan: null,
    donorMessage: null,
    isAnonymous: false,
    receiptNumber: null,
    receiptUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("runCaptureSideEffects (via applyPaymentEvent)", () => {
  beforeEach(() => {
    vi.mocked(getTenantById).mockReset().mockResolvedValue(tenant);
    vi.mocked(getCampaignById).mockReset().mockResolvedValue(null);
    vi.mocked(createDonation)
      .mockReset()
      .mockResolvedValue({ id: "donation-1" } as never);
    vi.mocked(listActiveAdminPersonIdsForTenant).mockReset().mockResolvedValue([]);
    vi.mocked(attachDonationAndReceipt).mockReset().mockResolvedValue(undefined);
    vi.mocked(getTransactionByProviderOrderId).mockReset();
    vi.mocked(markTransactionCapturedIfNotAlready).mockReset();
    vi.mocked(getPaymentTransactionById).mockReset();
    vi.mocked(generateAndStoreReceipt)
      .mockReset()
      .mockResolvedValue({ receiptNumber: "R-1", receiptUrl: "https://cdn.example/R-1.pdf" });
    vi.mocked(enqueueNotification).mockReset().mockResolvedValue([]);
    vi.mocked(processNotifications).mockReset().mockResolvedValue(undefined);
    vi.mocked(PaymentAuditService.transactionCaptured).mockReset();
  });

  it("folds PAN and donation message into the donation's notes, without adding a new column on donations", async () => {
    const captured = makeTransaction({ donorPan: "AAAAA9999A", donorMessage: "In memory of Grandma" });
    vi.mocked(getTransactionByProviderOrderId).mockResolvedValue(captured);
    vi.mocked(markTransactionCapturedIfNotAlready).mockResolvedValue(captured);
    vi.mocked(getPaymentTransactionById).mockResolvedValue(captured);

    await applyPaymentEvent("acct-1", "order_1", { type: "captured", providerPaymentId: "pay_1" });

    expect(createDonation).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({
        notes: "Razorpay transaction txn-1 | PAN: AAAAA9999A | Message: In memory of Grandma",
      }),
    );
  });

  it("omits the PAN/message segments entirely when neither was captured", async () => {
    const captured = makeTransaction();
    vi.mocked(getTransactionByProviderOrderId).mockResolvedValue(captured);
    vi.mocked(markTransactionCapturedIfNotAlready).mockResolvedValue(captured);
    vi.mocked(getPaymentTransactionById).mockResolvedValue(captured);

    await applyPaymentEvent("acct-1", "order_1", { type: "captured", providerPaymentId: "pay_1" });

    expect(createDonation).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ notes: "Razorpay transaction txn-1" }),
    );
  });

  it("passes the donor PAN through to receipt generation", async () => {
    const captured = makeTransaction({ donorPan: "AAAAA9999A" });
    vi.mocked(getTransactionByProviderOrderId).mockResolvedValue(captured);
    vi.mocked(markTransactionCapturedIfNotAlready).mockResolvedValue(captured);
    vi.mocked(getPaymentTransactionById).mockResolvedValue(captured);

    await applyPaymentEvent("acct-1", "order_1", { type: "captured", providerPaymentId: "pay_1" });

    expect(generateAndStoreReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ transaction: expect.objectContaining({ donorPan: "AAAAA9999A" }) }),
    );
  });
});
