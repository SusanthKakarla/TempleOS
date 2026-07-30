import type { TenantMembershipListItem } from "@/lib/db/tenant-memberships";
import type { ColumnDef } from "../types";

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-IN") : "—";
}

export interface UserExportLabels {
  headers: {
    name: string;
    phone: string;
    roles: string;
    status: string;
    joined: string;
    lastLogin: string;
  };
  enabled: string;
  disabled: string;
  /** Keyed by RoleCode ("admin", "priest", ...) — see userManagement.roleNames. */
  roleLabels: Record<string, string>;
}

export function buildUserExportColumns(labels: UserExportLabels): ColumnDef<TenantMembershipListItem>[] {
  return [
    { key: "displayName", header: labels.headers.name, accessor: (m) => m.displayName, width: 24 },
    { key: "phoneNumber", header: labels.headers.phone, accessor: (m) => m.phoneNumber, width: 18 },
    {
      key: "roles",
      header: labels.headers.roles,
      accessor: (m) => m.roles.map((role) => labels.roleLabels[role] ?? role).join(", ") || "—",
      width: 24,
    },
    {
      key: "status",
      header: labels.headers.status,
      accessor: (m) => (m.status === "active" ? labels.enabled : labels.disabled),
      width: 12,
    },
    { key: "createdAt", header: labels.headers.joined, accessor: (m) => formatDate(m.createdAt), width: 14 },
    { key: "lastSignedInAt", header: labels.headers.lastLogin, accessor: (m) => formatDate(m.lastSignedInAt), width: 16 },
  ];
}

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
