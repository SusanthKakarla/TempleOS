import type { DonationWithDonor } from "@/types/db";
import { formatInr } from "@/lib/currency";
import type { ColumnDef } from "../types";

export interface DonationExportLabels {
  headers: {
    donor: string;
    phone: string;
    amount: string;
    purpose: string;
    method: string;
    date: string;
    notes: string;
  };
  /** Keyed by PaymentMethod ("cash", "upi", ...) — see donations.paymentMethods / donation-options.ts. */
  paymentMethodLabels: Record<string, string>;
}

/**
 * `d.purpose` arrives already resolved to the caller's locale (dictionary
 * lookup for presets, machine-translated for free text) — see
 * resolveDonationPurposes in app/(dashboard)/dashboard/donations/page.tsx,
 * reused by the export route — so it needs no further translation here.
 */
export function buildDonationExportColumns(labels: DonationExportLabels): ColumnDef<DonationWithDonor>[] {
  return [
    { key: "donorName", header: labels.headers.donor, accessor: (d) => d.donorName, width: 24 },
    { key: "donorPhone", header: labels.headers.phone, accessor: (d) => d.donorPhone, width: 18 },
    { key: "amount", header: labels.headers.amount, accessor: (d) => formatInr(Number(d.amount)), width: 16 },
    { key: "purpose", header: labels.headers.purpose, accessor: (d) => d.purpose, width: 20 },
    {
      key: "paymentMethod",
      header: labels.headers.method,
      accessor: (d) => labels.paymentMethodLabels[d.paymentMethod] ?? d.paymentMethod,
      width: 14,
    },
    { key: "donatedAt", header: labels.headers.date, accessor: (d) => new Date(d.donatedAt).toLocaleDateString("en-IN"), width: 14 },
    { key: "notes", header: labels.headers.notes, accessor: (d) => d.notes ?? "—", width: 24 },
  ];
}

interface TemplateExampleRow {
  donorName: string;
  donorPhone: string;
  donorEmail: string;
  amount: string;
  purpose: string;
  paymentMethod: string;
  donatedAt: string;
  notes: string;
}

export const DONATION_IMPORT_TEMPLATE_COLUMNS: ColumnDef<TemplateExampleRow>[] = [
  { key: "donorName", header: "Donor Name", accessor: (r) => r.donorName, width: 24 },
  { key: "donorPhone", header: "Donor Phone (optional — links to an existing devotee if it matches)", accessor: (r) => r.donorPhone, width: 32 },
  { key: "donorEmail", header: "Donor Email (optional)", accessor: (r) => r.donorEmail, width: 22 },
  { key: "amount", header: "Amount", accessor: (r) => r.amount, width: 14 },
  { key: "purpose", header: "Purpose", accessor: (r) => r.purpose, width: 22 },
  {
    key: "paymentMethod",
    header: "Payment Method (cash, upi, bank_transfer, cheque, other)",
    accessor: (r) => r.paymentMethod,
    width: 30,
  },
  { key: "donatedAt", header: "Date (YYYY-MM-DD)", accessor: (r) => r.donatedAt, width: 18 },
  { key: "notes", header: "Notes (optional)", accessor: (r) => r.notes, width: 24 },
];

export const DONATION_IMPORT_TEMPLATE_EXAMPLE_ROWS: TemplateExampleRow[] = [
  {
    donorName: "Ravi Kumar",
    donorPhone: "+919876543210",
    donorEmail: "",
    amount: "1500",
    purpose: "General Donation",
    paymentMethod: "cash",
    donatedAt: "2026-01-15",
    notes: "",
  },
  {
    donorName: "Anjali Rao",
    donorPhone: "",
    donorEmail: "anjali@example.com",
    amount: "500",
    purpose: "Annadanam (Food Offering)",
    paymentMethod: "upi",
    donatedAt: "2026-01-20",
    notes: "In memory of grandmother",
  },
];
