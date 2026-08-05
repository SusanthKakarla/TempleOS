import { describe, expect, it } from "vitest";
import type { DonationExportRow } from "@/lib/db/donations";
import { buildDonationExportColumns, type DonationExportLabels } from "./donations";

const LABELS: DonationExportLabels = {
  headers: {
    donor: "Donor Name",
    phone: "Phone Number",
    amount: "Donation Amount",
    purpose: "Purpose",
    method: "Payment Method",
    date: "Donation Date",
    notes: "Notes",
    transactionId: "Transaction ID",
    paymentStatus: "Payment Status",
    campaign: "Campaign",
    receiptNumber: "Receipt Number",
    email: "Email",
    createdDate: "Created Date",
    updatedDate: "Updated Date",
  },
  paymentMethodLabels: { cash: "Cash", upi: "UPI", bank_transfer: "Bank Transfer", cheque: "Cheque", other: "Other" },
};

const DONATION_EXPORT_COLUMNS = buildDonationExportColumns(LABELS);

function makeDonation(overrides: Partial<DonationExportRow> = {}): DonationExportRow {
  return {
    id: "donation-1",
    tenantId: "tenant-1",
    devoteeId: "devotee-1",
    amount: "500.00",
    purpose: "General",
    paymentMethod: "upi",
    itemDescription: null,
    notes: null,
    donatedAt: "2026-01-15T00:00:00.000Z",
    recordedBy: null,
    manualDonorName: null,
    manualDonorPhone: null,
    manualDonorEmail: null,
    manualDonorAddress: null,
    isAnonymous: false,
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
    donorName: "Lakshmi Devi",
    donorPhone: "+919123456789",
    providerPaymentId: null,
    paymentStatus: null,
    receiptNumber: null,
    campaignTitle: null,
    ...overrides,
  };
}

function accessorFor(key: string) {
  const column = DONATION_EXPORT_COLUMNS.find((c) => c.key === key);
  if (!column) throw new Error(`No export column with key "${key}"`);
  return column.accessor;
}

describe("DONATION_EXPORT_COLUMNS", () => {
  it("returns the amount as a real number, tagged for xlsx currency formatting", () => {
    expect(accessorFor("amount")(makeDonation({ amount: "500.00" }))).toBe(500);
    const column = DONATION_EXPORT_COLUMNS.find((c) => c.key === "amount");
    expect(column?.format).toBe("currency");
  });

  it("falls back to an em dash for a non-cash donation with no amount", () => {
    expect(accessorFor("amount")(makeDonation({ amount: null }))).toBe("—");
  });

  it("maps payment method codes to readable labels", () => {
    expect(accessorFor("paymentMethod")(makeDonation({ paymentMethod: "upi" }))).toBe("UPI");
    expect(accessorFor("paymentMethod")(makeDonation({ paymentMethod: "bank_transfer" }))).toBe("Bank Transfer");
  });

  it("falls back to an em dash when notes are unset", () => {
    expect(accessorFor("notes")(makeDonation({ notes: null }))).toBe("—");
  });

  it("returns the donation date as a real Date object, tagged for xlsx date formatting", () => {
    const value = accessorFor("donatedAt")(makeDonation());
    expect(value).toBeInstanceOf(Date);
    const column = DONATION_EXPORT_COLUMNS.find((c) => c.key === "donatedAt");
    expect(column?.format).toBe("date");
  });

  it(
    "exposes the payment_transactions/campaign-joined columns (Transaction ID, Payment Status, " +
      "Receipt Number, Campaign) — null for manual/cash donations, which never have a " +
      "payment_transactions row, exactly the expected shape for an online-payment-only field",
    () => {
      const manual = makeDonation();
      expect(accessorFor("providerPaymentId")(manual)).toBe("—");
      expect(accessorFor("paymentStatus")(manual)).toBe("—");
      expect(accessorFor("receiptNumber")(manual)).toBe("—");
      expect(accessorFor("campaignTitle")(manual)).toBe("—");

      const online = makeDonation({
        providerPaymentId: "pay_ABC123",
        paymentStatus: "captured",
        receiptNumber: "RCPT-0001",
        campaignTitle: "Annual Fundraiser 2026",
      });
      expect(accessorFor("providerPaymentId")(online)).toBe("pay_ABC123");
      expect(accessorFor("paymentStatus")(online)).toBe("captured");
      expect(accessorFor("receiptNumber")(online)).toBe("RCPT-0001");
      expect(accessorFor("campaignTitle")(online)).toBe("Annual Fundraiser 2026");
    },
  );

  it("exposes the manual donor's email as a real column (only populated for manual/imported donors)", () => {
    expect(accessorFor("manualDonorEmail")(makeDonation({ manualDonorEmail: "donor@example.com" }))).toBe(
      "donor@example.com",
    );
    expect(accessorFor("manualDonorEmail")(makeDonation({ manualDonorEmail: null }))).toBe("—");
  });
});
