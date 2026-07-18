import { BellRing, CheckCircle2, Clock, XCircle } from "lucide-react";
import { getSessionAdmin } from "@/lib/auth/session";
import { getEventNotificationSummary, listRecentEventNotifications } from "@/lib/db/event-notifications";
import { MetricCard } from "@/features/dashboard/metric-card";
import { NotificationList } from "@/features/notifications/notification-list";

interface PageProps {
  searchParams: Promise<{ eventId?: string }>;
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const session = await getSessionAdmin();
  if (!session) return null; // guarded by the dashboard layout

  const { eventId } = await searchParams;

  const [summary, notifications] = await Promise.all([
    getEventNotificationSummary(session.tenantId),
    listRecentEventNotifications(session.tenantId, { eventId, limit: 50 }),
  ]);

  const successRate =
    summary.sent + summary.failed > 0
      ? Math.round((summary.sent / (summary.sent + summary.failed)) * 100)
      : 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Notification Center</h1>
        <p className="text-sm text-muted-foreground">
          Automatic WhatsApp notifications sent to devotees when events are published, updated, or cancelled.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Sent"
          value={summary.sent}
          icon={<CheckCircle2 className="size-4.5" />}
          gradient="gradient-green-emerald"
        />
        <MetricCard
          label="Failed"
          value={summary.failed}
          icon={<XCircle className="size-4.5" />}
          gradient="bg-destructive"
        />
        <MetricCard
          label="Pending"
          value={summary.pending}
          icon={<Clock className="size-4.5" />}
          gradient="gradient-saffron-gold"
        />
        <MetricCard
          label="Success Rate"
          value={successRate}
          format="percent"
          icon={<BellRing className="size-4.5" />}
          gradient="gradient-blue-purple"
        />
      </div>

      <NotificationList notifications={notifications} eventId={eventId} />
    </div>
  );
}
