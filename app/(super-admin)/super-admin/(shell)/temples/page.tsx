import Link from "next/link";
import {
  ArrowRight,
  Globe2,
  Landmark,
  Plus,
  UsersRound,
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
import { TableShell } from "@/components/table-shell";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { MobileListView } from "@/components/mobile-list-view";
import { MobileListRow } from "@/components/mobile-list-row";
import { listTenantsForSuperAdmin } from "@/lib/db/tenants";
import { requireSuperAdminPage } from "../../require-super-admin";

export default async function SuperAdminTemplesPage() {
  await requireSuperAdminPage("/super-admin/temples");
  const temples = await listTenantsForSuperAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Temples"
        subtitle="Provisioned tenant records, domain setup, and first admin/member status."
        actions={
          <Button render={<Link href="/super-admin/temples/new" />}>
            <Plus className="size-4" />
            New Temple
          </Button>
        }
      />

      {temples.length === 0 ? (
          <EmptyState
            icon={<Landmark className="size-6" />}
            title="No temples provisioned"
            description="Create the first temple to assign its subdomain and first member."
            className="min-h-80"
            action={
              <Button render={<Link href="/super-admin/temples/new" />}>
                <Plus className="size-4" />
                New Temple
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <TableShell>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Temple</TableHead>
                      <TableHead>Hostname</TableHead>
                      <TableHead>Primary Admin</TableHead>
                      <TableHead className="text-right">Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {temples.map((temple) => (
                      <TableRow key={temple.id}>
                        <TableCell>
                          <div className="min-w-52">
                            <p className="font-medium">{temple.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {temple.slug}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {temple.primaryHostname ? (
                            <span className="inline-flex items-center gap-2">
                              <Globe2 className="size-4 text-muted-foreground" />
                              {temple.primaryHostname}
                            </span>
                          ) : (
                            <Badge variant="outline">Missing domain</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {temple.primaryAdminName ? (
                            <div className="min-w-48">
                              <p className="inline-flex items-center gap-2">
                                <UsersRound className="size-4 text-muted-foreground" />
                                {temple.primaryAdminName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {temple.primaryAdminPhoneNumber ??
                                  "Phone unavailable"}{" "}
                                · {pluralizeMembers(temple.activeMemberCount)}
                              </p>
                            </div>
                          ) : (
                            <div className="min-w-48">
                              <Badge variant="outline">No admin member</Badge>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {pluralizeMembers(temple.activeMemberCount)}
                              </p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatTimestamp(temple.lastUpdatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            render={
                              <Link href={`/super-admin/temples/${temple.id}`} />
                            }
                          >
                            View
                            <ArrowRight className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableShell>
            </div>

            <div className="md:hidden">
              <MobileListView>
                {temples.map((temple) => (
                  <MobileListRow
                    key={temple.id}
                    href={`/super-admin/temples/${temple.id}`}
                    title={temple.name}
                    subtitle={temple.primaryHostname ?? temple.slug}
                    badge={
                      temple.primaryAdminName ? (
                        <span className="text-xs text-muted-foreground">
                          {pluralizeMembers(temple.activeMemberCount)}
                        </span>
                      ) : (
                        <Badge variant="outline">No admin</Badge>
                      )
                    }
                  />
                ))}
              </MobileListView>
            </div>
          </>
        )}
    </div>
  );
}

function pluralizeMembers(count: number): string {
  return `${count} active ${count === 1 ? "member" : "members"}`;
}

function formatTimestamp(value: string | null): string {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
