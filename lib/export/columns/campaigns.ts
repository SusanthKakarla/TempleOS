import type { Campaign } from "@/types/db";
import type { ColumnDef } from "../types";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export const CAMPAIGN_EXPORT_COLUMNS: ColumnDef<Campaign>[] = [
  { key: "title", header: "Title", accessor: (c) => c.title, width: 28 },
  { key: "campaignType", header: "Type", accessor: (c) => c.campaignType, width: 16 },
  { key: "status", header: "Status", accessor: (c) => c.status, width: 12 },
  { key: "scheduleType", header: "Schedule", accessor: (c) => c.scheduleType, width: 12 },
  { key: "nextRunAt", header: "Next Run", accessor: (c) => formatDateTime(c.nextRunAt), width: 20 },
  { key: "lastRunAt", header: "Last Sent", accessor: (c) => formatDateTime(c.lastRunAt), width: 20 },
  { key: "createdAt", header: "Created", accessor: (c) => formatDateTime(c.createdAt), width: 20 },
];
