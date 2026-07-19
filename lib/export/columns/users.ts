import type { TenantMembershipListItem } from "@/lib/db/tenant-memberships";
import type { ColumnDef } from "../types";

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-IN") : "—";
}

export const USER_EXPORT_COLUMNS: ColumnDef<TenantMembershipListItem>[] = [
  { key: "displayName", header: "Name", accessor: (m) => m.displayName, width: 24 },
  { key: "phoneNumber", header: "Phone", accessor: (m) => m.phoneNumber, width: 18 },
  { key: "roles", header: "Roles", accessor: (m) => m.roles.join(", ") || "—", width: 24 },
  { key: "status", header: "Status", accessor: (m) => (m.status === "active" ? "Enabled" : "Disabled"), width: 12 },
  { key: "createdAt", header: "Joined", accessor: (m) => formatDate(m.createdAt), width: 14 },
  { key: "lastSignedInAt", header: "Last Login", accessor: (m) => formatDate(m.lastSignedInAt), width: 16 },
];

export const USER_IMPORT_TEMPLATE_COLUMNS: ColumnDef<never>[] = [
  { key: "name", header: "Name", accessor: () => null, width: 24 },
  { key: "phone", header: "Phone", accessor: () => null, width: 18 },
  {
    key: "roles",
    header: "Roles (comma-separated: admin, priest, committee_member, volunteer, devotee)",
    accessor: () => null,
    width: 50,
  },
];
