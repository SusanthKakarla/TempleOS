import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  KeyRound,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listRoleDefinitionsForSuperAdmin } from "@/lib/db/role-definitions";
import { SuperAdminSignOutButton } from "@/features/super-admin/super-admin-sign-out-button";
import type { RoleCode, RoleDefinition } from "@/types/db";
import { requireSuperAdminPage } from "../require-super-admin";

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
    <main className="min-h-screen bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-4">
          <Button
            variant="ghost"
            className="px-0"
            render={<Link href="/super-admin" />}
          >
            <ArrowLeft className="size-4" />
            Temples
          </Button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Super Admin
              </p>
              <h1 className="text-2xl font-semibold tracking-normal">
                Role Catalog
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Fixed V0 platform roles, meanings, and capability markers used
                across temples.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                <ShieldCheck className="size-3" />
                Fixed V0
              </Badge>
              <Button
                variant="outline"
                render={<Link href="/super-admin/logout" />}
              >
                <LogOut className="size-4" />
                Log out
              </Button>
            </div>
          </div>
        </header>

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

        <section className="rounded-md border bg-background">
          <div className="border-b px-4 py-3">
            <h2 className="text-base font-semibold tracking-normal">
              V0 roles
            </h2>
            <p className="text-sm text-muted-foreground">
              Permission checks use role codes. Labels are display text only.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Meaning</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead className="text-right">State</TableHead>
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
                  <TableCell className="max-w-md text-sm text-muted-foreground">
                    {role.description ?? "No description available."}
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-56 flex-wrap gap-1">
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
        </section>
      </div>
    </main>
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
    <div className="rounded-md border bg-background p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold tracking-normal">{value}</p>
    </div>
  );
}
