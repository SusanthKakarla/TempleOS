import type { ConversationSummary } from "@/types/db";
import type { ColumnDef } from "../types";

export const CONVERSATION_EXPORT_COLUMNS: ColumnDef<ConversationSummary>[] = [
  { key: "displayName", header: "Devotee", accessor: (c) => c.displayName, width: 24 },
  { key: "whatsappPhone", header: "Phone", accessor: (c) => c.whatsappPhone, width: 18 },
  { key: "lastMessagePreview", header: "Last Message", accessor: (c) => c.lastMessagePreview ?? "—", width: 32 },
  {
    key: "lastMessageAt",
    header: "Last Activity",
    accessor: (c) => (c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString("en-IN") : "—"),
    width: 20,
  },
  { key: "unreadCount", header: "Unread", accessor: (c) => c.unreadCount, width: 10 },
  { key: "preferredLanguage", header: "Language", accessor: (c) => c.preferredLanguage?.toUpperCase() ?? "—", width: 10 },
  { key: "isDonor", header: "Donor", accessor: (c) => (c.isDonor ? "Yes" : "No"), width: 10 },
  { key: "whatsappOptInStatus", header: "Opted-in", accessor: (c) => (c.whatsappOptInStatus ? "Yes" : "No"), width: 10 },
];
