import type { Event } from "@/types/db";
import type { ColumnDef } from "../types";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export const EVENT_EXPORT_COLUMNS: ColumnDef<Event>[] = [
  { key: "title", header: "Title", accessor: (e) => e.title, width: 28 },
  { key: "status", header: "Status", accessor: (e) => e.status, width: 12 },
  { key: "startsAt", header: "Starts", accessor: (e) => formatDateTime(e.startsAt), width: 20 },
  { key: "endsAt", header: "Ends", accessor: (e) => (e.endsAt ? formatDateTime(e.endsAt) : "—"), width: 20 },
  { key: "location", header: "Location", accessor: (e) => e.location ?? "—", width: 20 },
  { key: "description", header: "Description", accessor: (e) => e.description ?? "—", width: 32 },
];
