import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Globe2,
  Landmark,
  MapPin,
  MessageCircle,
  Phone,
  UserRound,
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
import { TempleDetailEditForm } from "@/features/super-admin/temple-detail-edit-form";
import { MemberRoleEditor } from "@/features/super-admin/member-role-editor";
import { listRoleDefinitionsForSuperAdmin } from "@/lib/db/role-definitions";
import type { SuperAdminTenantDetail } from "@/lib/db/tenants";
import { requireSuperAdminPage } from "../../require-super-admin";

interface TempleDetailPageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function SuperAdminTempleDetailPage({ params }: TempleDetailPageProps) {
  const { tenantId } = await params;
  await requireSuperAdminPage(`/super-admin/temples/${tenantId}`);
  const temple = await fetchTempleDetailForSuperAdmin(tenantId);

  if (!temple) {
    notFound();
  }
  const roles = (await listRoleDefinitionsForSuperAdmin()).filter((role) => role.active);

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-4">
          <Button variant="ghost" className="px-0" render={<Link href="/super-admin" />}>
            <ArrowLeft className="size-4" />
            Temples
          </Button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Super Admin</p>
              <h1 className="text-2xl font-semibold tracking-normal">{temple.tenant.name}</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Tenant details, domain setup, member roles, and WhatsApp linkage.
              </p>
            </div>
            <Badge variant="outline">{temple.tenant.slug}</Badge>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-md border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Landmark className="size-4 text-muted-foreground" />
              Tenant Details
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              <DetailRow label="Tenant ID" value={temple.tenant.id} />
              <DetailRow label="Timezone" value={temple.tenant.timezone} />
              <DetailRow label="Contact phone" value={temple.tenant.defaultContactPhone} />
              <DetailRow label="Contact email" value={temple.tenant.contactEmail} />
              <DetailRow label="Address" value={temple.tenant.address} />
              <DetailRow label="Updated" value={formatTimestamp(temple.tenant.updatedAt)} />
            </dl>
          </div>

          <div className="rounded-md border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe2 className="size-4 text-muted-foreground" />
              Domain
            </div>
            {temple.domain ? (
              <dl className="mt-4 grid gap-3 text-sm">
                <DetailRow label="Hostname" value={temple.domain.hostname} />
                <DetailRow label="Kind" value={formatTitle(temple.domain.kind)} />
                <DetailRow label="Status" value={formatTitle(temple.domain.status)} />
                <DetailRow label="Updated" value={formatTimestamp(temple.domain.updatedAt)} />
              </dl>
            ) : (
              <EmptyPanel icon={<MapPin className="size-5" />} label="No active primary domain" />
            )}
          </div>

          <div className="rounded-md border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageCircle className="size-4 text-muted-foreground" />
              WhatsApp
            </div>
            {temple.whatsappAccount ? (
              <dl className="mt-4 grid gap-3 text-sm">
                <DetailRow label="Phone" value={temple.whatsappAccount.phoneNumber} />
                <DetailRow label="Meta phone ID" value={temple.whatsappAccount.metaPhoneNumberId} />
                <DetailRow label="Business ID" value={temple.whatsappAccount.metaBusinessAccountId} />
                <DetailRow label="Status" value={formatTitle(temple.whatsappAccount.status)} />
                <DetailRow label="Connected" value={formatTimestamp(temple.whatsappAccount.connectedAt)} />
              </dl>
            ) : (
              <EmptyPanel icon={<Phone className="size-5" />} label="No WhatsApp account linked" />
            )}
          </div>
        </section>

        <TempleDetailEditForm tenant={temple.tenant} />

        <section className="rounded-md border bg-background">
          <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
            <div>
              <h2 className="text-base font-semibold tracking-normal">Members</h2>
              <p className="text-sm text-muted-foreground">
                Active tenant memberships and platform-governed role assignments.
              </p>
            </div>
            <Badge variant="secondary">{temple.members.length} active</Badge>
          </div>
          {temple.members.length === 0 ? (
            <div className="px-4 py-10">
              <EmptyPanel icon={<UserRound className="size-5" />} label="No active members" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {temple.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="min-w-56">
                        <p className="font-medium">{member.displayName}</p>
                        <p className="text-xs text-muted-foreground">{member.personId}</p>
                      </div>
                    </TableCell>
                    <TableCell>{member.phoneNumber}</TableCell>
                    <TableCell>
                      <div className="mb-3 flex min-w-56 flex-wrap gap-1">
                        {member.roles.length > 0 ? (
                          member.roles.map((role) => (
                            <Badge key={role} variant={role === "admin" ? "secondary" : "outline"}>
                              {roles.find((item) => item.code === role)?.displayName ?? role}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline">No roles</Badge>
                        )}
                      </div>
                      <MemberRoleEditor tenantId={temple.tenant.id} member={member} roles={roles} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatTimestamp(member.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </main>
  );
}

async function fetchTempleDetailForSuperAdmin(tenantId: string): Promise<SuperAdminTenantDetail | null> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  if (!host) {
    throw new Error("Cannot fetch temple detail without a request host.");
  }

  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const res = await fetch(`${protocol}://${host}/api/super-admin/temples/${tenantId}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error("Temple detail API request failed.");
  }

  const body = (await res.json()) as { temple: SuperAdminTenantDetail };
  return body.temple;
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words text-foreground">{value || "Not available"}</dd>
    </div>
  );
}

function EmptyPanel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-md border border-dashed text-center text-sm text-muted-foreground">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function formatTitle(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimestamp(value: string | null): string {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
