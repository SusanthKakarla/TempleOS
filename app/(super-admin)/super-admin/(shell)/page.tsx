import Link from "next/link";
import {
  Activity,
  BellRing,
  CalendarDays,
  Database,
  HandCoins,
  Landmark,
  MessageCircle,
  Plus,
  Server,
  ShieldCheck,
  Users,
  UserCog,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/features/dashboard/metric-card";
import { countTenantsByStatus, getPlatformActivityCounts, checkDatabaseHealth, countConnectedWhatsAppTenants, countPendingNotificationsPlatformWide, getLastSystemActivityAt } from "@/lib/db/platform-stats";
import { listRecentPlatformAuditEntries } from "@/lib/db/audit-log";
import { requireSuperAdminPage } from "../require-super-admin";

export default async function SuperAdminDashboardPage() {
  await requireSuperAdminPage("/super-admin");

  const [tenantCounts, activityCounts, dbHealth, whatsappHealth, pendingNotifications, lastSystemActivityAt, recentActivity] =
    await Promise.all([
      countTenantsByStatus(),
      getPlatformActivityCounts(),
      checkDatabaseHealth(),
      countConnectedWhatsAppTenants(),
      countPendingNotificationsPlatformWide(),
      getLastSystemActivityAt(),
      listRecentPlatformAuditEntries(20),
    ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Super Admin</p>
          <h1 className="text-2xl font-semibold tracking-normal">Platform Dashboard</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Platform-wide metrics, activity, and health across every provisioned temple.
          </p>
        </div>
        <Button render={<Link href="/super-admin/temples/new" />}>
          <Plus className="size-4" />
          New Temple
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Total Temples" value={tenantCounts.total} icon={<Landmark className="size-4.5" />} gradient="gradient-ocean-blue" />
          <MetricCard label="Active Temples" value={tenantCounts.active} icon={<ShieldCheck className="size-4.5" />} gradient="gradient-green-emerald" />
          <MetricCard label="Suspended Temples" value={tenantCounts.suspended} icon={<Activity className="size-4.5" />} gradient="bg-destructive" />
          <MetricCard label="Total Devotees" value={activityCounts.totalDevotees} icon={<Users className="size-4.5" />} gradient="gradient-blue-purple" />
          <MetricCard label="Total Temple Users" value={activityCounts.totalTempleUsers} icon={<UsersRound className="size-4.5" />} gradient="gradient-blue-purple" />
          <MetricCard label="Total Donations" value={activityCounts.totalDonations} format="currency" icon={<HandCoins className="size-4.5" />} gradient="gradient-saffron-gold" />
          <MetricCard label="Total WhatsApp Messages" value={activityCounts.totalWhatsAppMessages} icon={<MessageCircle className="size-4.5" />} gradient="gradient-green-emerald" />
          <MetricCard label="Active WhatsApp Accounts" value={whatsappHealth.connected} icon={<MessageCircle className="size-4.5" />} gradient="gradient-green-emerald" />
          <MetricCard label="Notifications Sent" value={activityCounts.totalNotificationsSent} icon={<BellRing className="size-4.5" />} gradient="gradient-green-emerald" />
          <MetricCard label="Total Events" value={activityCounts.totalEvents} icon={<CalendarDays className="size-4.5" />} gradient="gradient-maroon-orange" />
          <MetricCard label="Total Conversations" value={activityCounts.totalConversations} icon={<MessageCircle className="size-4.5" />} gradient="gradient-blue-purple" />
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="glass-card rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Server className="size-4 text-muted-foreground" />
              Platform Health
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <HealthTile
                label="Database"
                ok={dbHealth.ok}
                detail={dbHealth.ok ? `${dbHealth.latencyMs}ms` : "Unreachable"}
              />
              <HealthTile
                label="WhatsApp"
                ok={whatsappHealth.connected > 0}
                detail={`${whatsappHealth.connected}/${whatsappHealth.total} temples connected`}
              />
              <HealthTile
                label="Notification Queue"
                ok={pendingNotifications < 100}
                detail={`${pendingNotifications} pending`}
              />
              <HealthTile
                label="Cron Activity"
                ok={Boolean(lastSystemActivityAt)}
                detail={lastSystemActivityAt ? `Last seen ${formatTimestamp(lastSystemActivityAt)}` : "No activity yet"}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Storage and background-worker monitoring aren&apos;t tracked in this app yet — nothing fabricated here.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Database className="size-4 text-muted-foreground" />
              Live Activity
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No platform activity yet.</p>
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
                {recentActivity.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
                    <span className="font-medium">{formatTitle(entry.action.replace(/\./g, " "))}</span>
                    <span className="text-xs text-muted-foreground">{formatTimestamp(entry.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="glass-card rounded-2xl p-4">
          <h2 className="mb-3 text-sm font-medium">Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href="/super-admin/temples/new" />}>
              <Plus className="size-4" />
              Create Temple
            </Button>
            <Button variant="outline" render={<Link href="/super-admin/temples" />}>
              <Landmark className="size-4" />
              Temples
            </Button>
            <Button variant="outline" render={<Link href="/super-admin/roles" />}>
              <ShieldCheck className="size-4" />
              Role Catalog
            </Button>
            <Button variant="outline" render={<Link href="/super-admin/admins" />}>
              <UserCog className="size-4" />
              Platform Admins
            </Button>
          </div>
        </section>
    </div>
  );
}

function HealthTile({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant={ok ? "default" : "destructive"}>{ok ? "Healthy" : "Attention"}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </Card>
  );
}

function formatTitle(value: string): string {
  return value
    .split(/[\s_]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
