import type { DonationWithDonor } from "@/types/db";
import { formatDonationAmount } from "@/lib/currency";
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
  paymentMethodLabels: Record<string, string>;
}

export function buildDonationExportColumns(labels: DonationExportLabels): ColumnDef<DonationWithDonor>[] {
  return [
    { key: "donorName", header: labels.headers.donor, accessor: (d) => d.donorName, width: 24 },
    { key: "donorPhone", header: labels.headers.phone, accessor: (d) => d.donorPhone, width: 18 },
    { key: "amount", header: labels.headers.amount, accessor: (d) => formatDonationAmount(d.amount), width: 16 },
    { key: "purpose", header: labels.headers.purpose, accessor: (d) => d.purpose, width: 20 },
    {
      key: "paymentMethod",
      header: labels.headers.method,
      accessor: (d) => (d.paymentMethod ? (labels.paymentMethodLabels[d.paymentMethod] ?? d.paymentMethod) : "—"),
      width: 14,
    },
    { key: "donatedAt", header: labels.headers.date, accessor: (d) => new Date(d.donatedAt).toLocaleDateString("en-IN"), width: 14 },
    { key: "notes", header: labels.headers.notes, accessor: (d) => d.notes ?? "—", width: 24 },
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
  { key: "donorName", header: "Donor Name", accessor: (r) => r.donorName, width: 24 },
  { key: "donorPhone", header: "Phone", accessor: (r) => r.donorPhone, width: 18 },
  { key: "amount", header: "Amount (INR)", accessor: (r) => r.amount, width: 14 },
  { key: "purpose", header: "Purpose", accessor: (r) => r.purpose, width: 20 },
  { key: "paymentMethod", header: "Payment Method (cash/upi/bank_transfer/cheque/other)", accessor: (r) => r.paymentMethod, width: 36 },
  { key: "date", header: "Date (YYYY-MM-DD)", accessor: (r) => r.date, width: 18 },
  { key: "notes", header: "Notes", accessor: (r) => r.notes, width: 24 },
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
