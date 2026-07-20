import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireDashboardAdmin } from "../../require-dashboard-admin";
import { listAuditLogEntriesForTenant } from "@/lib/db/audit-log";
import { listTenantMembershipsForTenant } from "@/lib/db/tenant-memberships";
import { ActivityLogTable } from "@/features/users/activity-log-table";
import { PageHeader } from "@/components/page-header";

export default async function UsersActivityPage() {
  const session = await requireDashboardAdmin();
  const t = await getTranslations("userManagement.activityLog");

  const [entries, members] = await Promise.all([
    listAuditLogEntriesForTenant(session.tenantId, { limit: 100 }),
    listTenantMembershipsForTenant(session.tenantId),
  ]);

  const memberNames = Object.fromEntries(members.map((m) => [m.id, m.displayName]));

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/users"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("backToUsers")}
      </Link>
      <PageHeader title={t("pageTitle")} subtitle={t("subtitle")} />
      <ActivityLogTable entries={entries} memberNames={memberNames} />
    </div>
  );
}
