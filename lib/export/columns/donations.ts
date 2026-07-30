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
