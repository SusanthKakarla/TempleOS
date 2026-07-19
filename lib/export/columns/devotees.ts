import type { Devotee } from "@/types/db";
import { formatInr } from "@/lib/currency";
import type { ColumnDef } from "../types";

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-IN") : "—";
}

export const DEVOTEE_EXPORT_COLUMNS: ColumnDef<Devotee>[] = [
  { key: "displayName", header: "Name", accessor: (d) => d.displayName, width: 24 },
  { key: "whatsappPhone", header: "Phone", accessor: (d) => d.whatsappPhone, width: 18 },
  { key: "whatsappOptInStatus", header: "WhatsApp Opt-in", accessor: (d) => (d.whatsappOptInStatus ? "Yes" : "No"), width: 14 },
  { key: "preferredLanguage", header: "Language", accessor: (d) => d.preferredLanguage?.toUpperCase() ?? "—", width: 10 },
  { key: "isDonor", header: "Donor", accessor: (d) => (d.isDonor ? "Yes" : "No"), width: 10 },
  { key: "totalDonatedAmount", header: "Total Donated", accessor: (d) => formatInr(Number(d.totalDonatedAmount)), width: 16 },
  { key: "birthStar", header: "Birth Star", accessor: (d) => d.birthStar ?? "—", width: 16 },
  { key: "ancestralLineage", header: "Gothram", accessor: (d) => d.ancestralLineage ?? "—", width: 16 },
  { key: "dateOfBirth", header: "Date of Birth", accessor: (d) => d.dateOfBirth ?? "—", width: 14 },
  { key: "firstSeenAt", header: "First Seen", accessor: (d) => formatDate(d.firstSeenAt), width: 14 },
  { key: "lastSeenAt", header: "Last Seen", accessor: (d) => formatDate(d.lastSeenAt), width: 14 },
];

export const DEVOTEE_IMPORT_TEMPLATE_COLUMNS: ColumnDef<never>[] = [
  { key: "name", header: "Name", accessor: () => null, width: 24 },
  { key: "phone", header: "WhatsApp Phone", accessor: () => null, width: 18 },
  { key: "dob", header: "Date of Birth (YYYY-MM-DD)", accessor: () => null, width: 20 },
  { key: "birthStar", header: "Birth Star", accessor: () => null, width: 16 },
  { key: "gothram", header: "Gothram/Ancestral Lineage", accessor: () => null, width: 20 },
];
