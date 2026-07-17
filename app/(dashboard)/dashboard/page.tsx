import { getSessionAdmin } from "@/lib/auth/session";
import { countUpcomingPublishedEvents } from "@/lib/db/events";
import { countDevotees, countOptedInDevotees } from "@/lib/db/devotees";
import { countFailedMessages, countMessagesByDirection } from "@/lib/db/whatsapp-messages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardHomePage() {
  const session = await getSessionAdmin();
  if (!session) return null; // guarded by the dashboard layout

  const [upcomingEvents, totalDevotees, optedInDevotees, messagesReceived, messagesSent, failedSends] =
    await Promise.all([
      countUpcomingPublishedEvents(session.tenantId),
      countDevotees(session.tenantId),
      countOptedInDevotees(session.tenantId),
      countMessagesByDirection(session.tenantId, "inbound"),
      countMessagesByDirection(session.tenantId, "outbound"),
      countFailedMessages(session.tenantId),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of temple activity.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Upcoming Events" value={upcomingEvents} />
        <MetricCard label="Total Devotees" value={totalDevotees} />
        <MetricCard label="WhatsApp Opt-ins" value={optedInDevotees} />
        <MetricCard label="Messages Received" value={messagesReceived} />
        <MetricCard label="Messages Sent" value={messagesSent} />
        <MetricCard label="Failed Sends" value={failedSends} />
      </div>
    </div>
  );
}
