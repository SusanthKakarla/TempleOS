import type { DonationWithDonor } from "@/types/db";
import { formatDonationAmount, formatDonationKindOrMethod } from "@/lib/currency";
import type { ColumnDef } from "../types";

export const DONATION_EXPORT_COLUMNS: ColumnDef<DonationWithDonor>[] = [
  { key: "donorName", header: "Donor", accessor: (d) => d.donorName, width: 24 },
  { key: "donorPhone", header: "Phone", accessor: (d) => d.donorPhone, width: 18 },
  { key: "amount", header: "Amount", accessor: (d) => formatDonationAmount(d.amount), width: 16 },
  { key: "itemDescription", header: "Item", accessor: (d) => d.itemDescription ?? "—", width: 20 },
  { key: "purpose", header: "Purpose", accessor: (d) => d.purpose, width: 20 },
  { key: "paymentMethod", header: "Method", accessor: (d) => formatDonationKindOrMethod(d.paymentMethod, d.itemDescription), width: 14 },
  { key: "donatedAt", header: "Date", accessor: (d) => new Date(d.donatedAt).toLocaleDateString("en-IN"), width: 14 },
  { key: "notes", header: "Notes", accessor: (d) => d.notes ?? "—", width: 24 },
];
