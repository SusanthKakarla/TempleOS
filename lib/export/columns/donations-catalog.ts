import type { ExportColumnCatalogEntry } from "./devotees-catalog";

/**
 * Client-safe column catalog for the Donations export column picker — see
 * devotees-catalog.ts for why this is a separate, server-import-free file.
 * `id` matches the `key` each ColumnDef in buildDonationExportColumns
 * (../columns/donations.ts) uses; `labelKey` resolves under
 * `exportLabels.donations.*`.
 */
export const DONATION_EXPORT_COLUMN_CATALOG: ExportColumnCatalogEntry[] = [
  { id: "donorName", labelKey: "donor" },
  { id: "donorPhone", labelKey: "phone" },
  { id: "amount", labelKey: "amount" },
  { id: "purpose", labelKey: "purpose" },
  { id: "paymentMethod", labelKey: "method" },
  { id: "providerPaymentId", labelKey: "transactionId" },
  { id: "paymentStatus", labelKey: "paymentStatus" },
  { id: "donatedAt", labelKey: "date" },
  { id: "campaignTitle", labelKey: "campaign" },
  { id: "receiptNumber", labelKey: "receiptNumber" },
  { id: "manualDonorEmail", labelKey: "email" },
  { id: "notes", labelKey: "notes" },
  { id: "createdAt", labelKey: "createdDate" },
  { id: "updatedAt", labelKey: "updatedDate" },
];
