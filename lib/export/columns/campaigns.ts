import type { Campaign } from "@/types/db";
import type { ColumnDef } from "../types";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export interface CampaignExportLabels {
  headers: {
    title: string;
    type: string;
    status: string;
    schedule: string;
    nextRun: string;
    lastSent: string;
    created: string;
  };
  /** Keyed by CampaignType — see campaigns.types. */
  typeLabels: Record<string, string>;
  /** Keyed by CampaignStatus — see campaigns.status. */
  statusLabels: Record<string, string>;
  /** Keyed by CampaignScheduleType ("one_time", "recurring") — also covered by campaigns.types. */
  scheduleLabels: Record<string, string>;
}

/** `c.title`/`c.description` arrive already translated — see translateFields wiring in the campaigns pages, reused by the export route. */
export function buildCampaignExportColumns(labels: CampaignExportLabels): ColumnDef<Campaign>[] {
  return [
    { key: "title", header: labels.headers.title, accessor: (c) => c.title, width: 28 },
    { key: "campaignType", header: labels.headers.type, accessor: (c) => labels.typeLabels[c.campaignType] ?? c.campaignType, width: 16 },
    { key: "status", header: labels.headers.status, accessor: (c) => labels.statusLabels[c.status] ?? c.status, width: 12 },
    {
      key: "scheduleType",
      header: labels.headers.schedule,
      accessor: (c) => labels.scheduleLabels[c.scheduleType] ?? c.scheduleType,
      width: 12,
    },
    { key: "nextRunAt", header: labels.headers.nextRun, accessor: (c) => formatDateTime(c.nextRunAt), width: 20 },
    { key: "lastRunAt", header: labels.headers.lastSent, accessor: (c) => formatDateTime(c.lastRunAt), width: 20 },
    { key: "createdAt", header: labels.headers.created, accessor: (c) => formatDateTime(c.createdAt), width: 20 },
  ];
}
