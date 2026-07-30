import type { WhatsAppMessage } from "@/types/db";
import type { ColumnDef } from "../types";

export interface WhatsAppThreadExportLabels {
  headers: {
    timestamp: string;
    direction: string;
    type: string;
    status: string;
    message: string;
  };
  devotee: string;
  temple: string;
}

export function buildWhatsAppThreadExportColumns(labels: WhatsAppThreadExportLabels): ColumnDef<WhatsAppMessage>[] {
  return [
    { key: "createdAt", header: labels.headers.timestamp, accessor: (m) => new Date(m.createdAt).toLocaleString("en-IN"), width: 20 },
    {
      key: "direction",
      header: labels.headers.direction,
      accessor: (m) => (m.direction === "inbound" ? labels.devotee : labels.temple),
      width: 12,
    },
    { key: "messageType", header: labels.headers.type, accessor: (m) => m.messageType, width: 12 },
    { key: "status", header: labels.headers.status, accessor: (m) => m.status, width: 12 },
    { key: "body", header: labels.headers.message, accessor: (m) => m.body, width: 48 },
  ];
}
