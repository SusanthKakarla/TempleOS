import type { DonationWithDonor } from "@/types/db";
import { formatInr } from "@/lib/currency";
import type { ColumnDef } from "../types";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  other: "Other",
};

export const DONATION_EXPORT_COLUMNS: ColumnDef<DonationWithDonor>[] = [
  { key: "donorName", header: "Donor", accessor: (d) => d.donorName, width: 24 },
  { key: "donorPhone", header: "Phone", accessor: (d) => d.donorPhone, width: 18 },
  { key: "amount", header: "Amount", accessor: (d) => formatInr(Number(d.amount)), width: 16 },
  { key: "purpose", header: "Purpose", accessor: (d) => d.purpose, width: 20 },
  { key: "paymentMethod", header: "Method", accessor: (d) => PAYMENT_METHOD_LABEL[d.paymentMethod] ?? d.paymentMethod, width: 14 },
  { key: "donatedAt", header: "Date", accessor: (d) => new Date(d.donatedAt).toLocaleDateString("en-IN"), width: 14 },
  { key: "notes", header: "Notes", accessor: (d) => d.notes ?? "—", width: 24 },
];
