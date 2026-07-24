import { BadgeCheck, KeyRound, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableShell } from "@/components/table-shell";
import { PageHeader } from "@/components/page-header";
import { listRoleDefinitionsForSuperAdmin } from "@/lib/db/role-definitions";
import type { RoleCode, RoleDefinition } from "@/types/db";
import { requireSuperAdminPage } from "../../require-super-admin";

const roleOrder: RoleCode[] = [
  "admin",
  "priest",
  "committee_member",
  "volunteer",
  "devotee",
];

const capabilityLabels: Record<string, string> = {
  dashboardAccess: "Dashboard access",
  manageTenantMembers: "Member management",
  manageTenantRoles: "Role assignment",
  identityMarker: "Identity marker",
  tenantRelationshipMarker: "Tenant relationship",
};

export default async function SuperAdminRolesPage() {
  await requireSuperAdminPage("/super-admin/roles");
  const roles = await listRoleDefinitionsForSuperAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Catalog"
        subtitle="Fixed V0 platform roles, meanings, and capability markers used across temples."
        actions={
          <Badge variant="secondary">
            <ShieldCheck className="size-3" />
            Fixed V0
          </Badge>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryPanel
          icon={<BadgeCheck className="size-4" />}
          label="Catalog"
          value="5 fixed roles"
        />
        <SummaryPanel
          icon={<KeyRound className="size-4" />}
          label="Authorization"
          value="Stable codes"
        />
        <SummaryPanel
          icon={<ShieldCheck className="size-4" />}
          label="Scope"
          value="Platform governed"
        />
      </section>

      <TableShell>
        <div className="border-b px-4 py-3">
          <h2 className="text-base font-semibold tracking-normal">
            V0 roles
          </h2>
          <p className="text-sm text-muted-foreground">
            Permission checks use role codes. Labels are display text only.
          </p>
        </div>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Code</TableHead>
                <TableHead className="w-36">Label</TableHead>
                <TableHead>Meaning</TableHead>
                <TableHead className="w-72">Capabilities</TableHead>
                <TableHead className="w-24 text-right">State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortRoles(roles).map((role) => (
                <TableRow key={role.code}>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {role.code}
                    </code>
                  </TableCell>
                  <TableCell className="font-medium">
                    {role.displayName}
                  </TableCell>
                  <TableCell className="max-w-md text-sm wrap-break-word text-muted-foreground">
                    {role.description ?? "No description available."}
                  </TableCell>
                  <TableCell className="w-72">
                    <div className="flex flex-wrap gap-1">
                      {capabilitiesFor(role).map((capability) => (
                        <Badge key={capability} variant="outline">
                          {capability}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={role.active ? "secondary" : "outline"}>
                      {role.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="divide-y md:hidden">
          {sortRoles(roles).map((role) => (
            <div key={role.code} className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{role.displayName}</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{role.code}</code>
                </div>
                <Badge variant={role.active ? "secondary" : "outline"}>
                  {role.active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {role.description ?? "No description available."}
              </p>
              <div className="flex flex-wrap gap-1">
                {capabilitiesFor(role).map((capability) => (
                  <Badge key={capability} variant="outline">
                    {capability}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </TableShell>
    </div>
  );
}

function sortRoles(roles: RoleDefinition[]): RoleDefinition[] {
  const order = new Map(roleOrder.map((role, index) => [role, index]));
  return [...roles].sort(
    (a, b) => (order.get(a.code) ?? 99) - (order.get(b.code) ?? 99),
  );
}

function capabilitiesFor(role: RoleDefinition): string[] {
  const capabilities = Object.entries(role.capabilitySet)
    .filter(([, enabled]) => enabled === true)
    .map(([key]) => capabilityLabels[key] ?? key);

  return capabilities.length > 0
    ? capabilities
    : ["No V0 dashboard permission"];
}

function SummaryPanel({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold tracking-normal">{value}</p>
    </div>
  );
}
