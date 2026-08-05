import type { ColumnDef } from "../types";
import type { DonationExportRow } from "@/lib/db/donations";

export interface DonationExportLabels {
  headers: {
    donor: string;
    phone: string;
    amount: string;
    purpose: string;
    method: string;
    date: string;
    notes: string;
    transactionId: string;
    paymentStatus: string;
    campaign: string;
    receiptNumber: string;
    email: string;
    createdDate: string;
    updatedDate: string;
  };
  paymentMethodLabels: Record<string, string>;
}

/**
 * Order matches the requested column picker checklist (Donor Name through
 * Updated Date). "PAN Number" from the original request is intentionally
 * absent — no such column exists anywhere in the schema. Transaction ID/
 * Payment Status/Campaign/Receipt Number come from payment_transactions via
 * lib/db/donations.ts's listDonationsForExport — null for manual/cash
 * donations, which never have a payment_transactions row, exactly as
 * expected for an optional online-payment-only field.
 */
export function buildDonationExportColumns(labels: DonationExportLabels): ColumnDef<DonationExportRow>[] {
  return [
    { key: "donorName", header: labels.headers.donor, accessor: (d) => d.donorName, width: 24 },
    { key: "donorPhone", header: labels.headers.phone, accessor: (d) => d.donorPhone ?? "—", width: 18 },
    {
      key: "amount",
      header: labels.headers.amount,
      accessor: (d) => (d.amount === null ? "—" : Number(d.amount)),
      width: 16,
      format: "currency",
    },
    { key: "purpose", header: labels.headers.purpose, accessor: (d) => d.purpose, width: 20 },
    {
      key: "paymentMethod",
      header: labels.headers.method,
      accessor: (d) => (d.paymentMethod ? (labels.paymentMethodLabels[d.paymentMethod] ?? d.paymentMethod) : "—"),
      width: 14,
    },
    { key: "providerPaymentId", header: labels.headers.transactionId, accessor: (d) => d.providerPaymentId ?? "—", width: 22 },
    { key: "paymentStatus", header: labels.headers.paymentStatus, accessor: (d) => d.paymentStatus ?? "—", width: 14 },
    { key: "donatedAt", header: labels.headers.date, accessor: (d) => new Date(d.donatedAt), width: 14, format: "date" },
    { key: "campaignTitle", header: labels.headers.campaign, accessor: (d) => d.campaignTitle ?? "—", width: 22 },
    { key: "receiptNumber", header: labels.headers.receiptNumber, accessor: (d) => d.receiptNumber ?? "—", width: 18 },
    { key: "manualDonorEmail", header: labels.headers.email, accessor: (d) => d.manualDonorEmail ?? "—", width: 24 },
    { key: "notes", header: labels.headers.notes, accessor: (d) => d.notes ?? "—", width: 24 },
    { key: "createdAt", header: labels.headers.createdDate, accessor: (d) => new Date(d.createdAt), width: 14, format: "date" },
    { key: "updatedAt", header: labels.headers.updatedDate, accessor: (d) => new Date(d.updatedAt), width: 14, format: "date" },
  ];
}

// ---------------------------------------------------------------------------
// Import template
// ---------------------------------------------------------------------------

interface DonationImportRow {
  donorName: string;
  donorPhone: string;
  amount: string;
  purpose: string;
  paymentMethod: string;
  date: string;
  notes: string;
}

export const DONATION_IMPORT_TEMPLATE_COLUMNS: ColumnDef<DonationImportRow>[] = [
  { key: "donorName", header: "Donor Name (Required)", accessor: (r) => r.donorName, width: 26 },
  { key: "donorPhone", header: "Phone (Optional)", accessor: (r) => r.donorPhone, width: 18 },
  { key: "amount", header: "Amount (INR) (Required)", accessor: (r) => r.amount, width: 18 },
  { key: "purpose", header: "Purpose (Optional)", accessor: (r) => r.purpose, width: 22 },
  {
    key: "paymentMethod",
    header: "Payment Method (cash/upi/bank_transfer/cheque/other) (Optional)",
    accessor: (r) => r.paymentMethod,
    width: 42,
  },
  { key: "date", header: "Date (YYYY-MM-DD) (Optional)", accessor: (r) => r.date, width: 22 },
  { key: "notes", header: "Notes (Optional)", accessor: (r) => r.notes, width: 24 },
];

export const DONATION_IMPORT_TEMPLATE_EXAMPLE_ROWS: DonationImportRow[] = [
  {
    donorName: "Lakshmi Devi",
    donorPhone: "+919876543210",
    amount: "1001",
    purpose: "General",
    paymentMethod: "cash",
    date: "2026-01-15",
    notes: "",
  },
  {
    donorName: "Ramesh Reddy",
    donorPhone: "+919000000001",
    amount: "5000",
    purpose: "Annadanam",
    paymentMethod: "upi",
    date: "2026-01-20",
    notes: "Monthly contribution",
  },
];
