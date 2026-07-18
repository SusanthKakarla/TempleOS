import Link from "next/link";
import { ArrowRight, Globe2, Landmark, MessageCircle, Plus, UsersRound } from "lucide-react";
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
import { listTenantsForSuperAdmin } from "@/lib/db/tenants";
import { requireSuperAdminPage } from "./require-super-admin";

export default async function SuperAdminPage() {
  await requireSuperAdminPage();
  const temples = await listTenantsForSuperAdmin();

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Super Admin</p>
            <h1 className="text-2xl font-semibold tracking-normal">Temples</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Provisioned tenant records, domain setup, first admin/member status, and WhatsApp linkage.
            </p>
          </div>
          <Button render={<Link href="/super-admin/temples/new" />}>
            <Plus className="size-4" />
            New Temple
          </Button>
        </header>

        {temples.length === 0 ? (
          <section className="flex min-h-80 flex-col items-center justify-center rounded-md border border-dashed bg-background px-6 py-12 text-center">
            <Landmark className="mb-4 size-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-normal">No temples provisioned</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Create the first temple to assign its subdomain, first member, and optional WhatsApp linkage.
            </p>
            <Button className="mt-6" render={<Link href="/super-admin/temples/new" />}>
              <Plus className="size-4" />
              New Temple
            </Button>
          </section>
        ) : (
          <section className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Temple</TableHead>
                  <TableHead>Hostname</TableHead>
                  <TableHead>Primary Admin</TableHead>
                  <TableHead>WhatsApp</TableHead>
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
                        <p className="text-xs text-muted-foreground">{temple.slug}</p>
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
                            {temple.primaryAdminPhoneNumber ?? "Phone unavailable"} ·{" "}
                            {pluralizeMembers(temple.activeMemberCount)}
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
                    <TableCell>
                      <Badge variant={temple.whatsappStatus === "linked" ? "secondary" : "outline"}>
                        <MessageCircle className="size-3" />
                        {temple.whatsappStatus === "linked" ? "Linked" : "Unlinked"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatTimestamp(temple.lastUpdatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        render={<Link href={`/super-admin/temples/${temple.id}`} />}
                      >
                        View
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        )}
      </div>
    </main>
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
