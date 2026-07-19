import type { WhatsAppMessage } from "@/types/db";
import type { ColumnDef } from "../types";

export const WHATSAPP_THREAD_EXPORT_COLUMNS: ColumnDef<WhatsAppMessage>[] = [
  { key: "createdAt", header: "Timestamp", accessor: (m) => new Date(m.createdAt).toLocaleString("en-IN"), width: 20 },
  { key: "direction", header: "Direction", accessor: (m) => (m.direction === "inbound" ? "Devotee" : "Temple"), width: 12 },
  { key: "messageType", header: "Type", accessor: (m) => m.messageType, width: 12 },
  { key: "status", header: "Status", accessor: (m) => m.status, width: 12 },
  { key: "body", header: "Message", accessor: (m) => m.body, width: 48 },
];
