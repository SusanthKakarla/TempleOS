import type { Event } from "@/types/db";
import type { ColumnDef } from "../types";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export interface EventExportLabels {
  headers: {
    title: string;
    status: string;
    starts: string;
    ends: string;
    location: string;
    description: string;
  };
  /** Keyed by EventStatus ("published", "draft", "cancelled") — see events.columns.statusLabels if present, else events.statusLabels. */
  statusLabels: Record<string, string>;
}

/** `e.title`/`e.description` arrive already translated — see translateFields wiring in the events page, reused by the export route. */
export function buildEventExportColumns(labels: EventExportLabels): ColumnDef<Event>[] {
  return [
    { key: "title", header: labels.headers.title, accessor: (e) => e.title, width: 28 },
    { key: "status", header: labels.headers.status, accessor: (e) => labels.statusLabels[e.status] ?? e.status, width: 12 },
    { key: "startsAt", header: labels.headers.starts, accessor: (e) => formatDateTime(e.startsAt), width: 20 },
    { key: "endsAt", header: labels.headers.ends, accessor: (e) => (e.endsAt ? formatDateTime(e.endsAt) : "—"), width: 20 },
    { key: "location", header: labels.headers.location, accessor: (e) => e.location ?? "—", width: 20 },
    { key: "description", header: labels.headers.description, accessor: (e) => e.description ?? "—", width: 32 },
  ];
}
