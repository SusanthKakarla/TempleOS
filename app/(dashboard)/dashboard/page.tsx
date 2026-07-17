import {
  AlertTriangle,
  CalendarDays,
  MessageCircle,
  Megaphone,
  Send,
  Users,
} from "lucide-react";
import { getSessionAdmin } from "@/lib/auth/session";
import { getTenantById } from "@/lib/db/tenants";
import { countUpcomingPublishedEvents, listEvents } from "@/lib/db/events";
import { countDevotees, countOptedInDevotees, listRecentDevotees } from "@/lib/db/devotees";
import {
  countFailedMessages,
  countMessagesByDirection,
  listRecentMessages,
} from "@/lib/db/whatsapp-messages";
import { MetricCard } from "@/features/dashboard/metric-card";
import { UpcomingEventsWidget } from "@/features/dashboard/upcoming-events-widget";
import { RecentDevoteesWidget } from "@/features/dashboard/recent-devotees-widget";
import { RecentMessagesWidget } from "@/features/dashboard/recent-messages-widget";
import { QuickActions } from "@/features/dashboard/quick-actions";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardHomePage() {
  const session = await getSessionAdmin();
  if (!session) return null; // guarded by the dashboard layout

  const [
    tenant,
    upcomingEvents,
    totalDevotees,
    optedInDevotees,
    messagesReceived,
    messagesSent,
    failedSends,
    upcomingEventsList,
    recentDevotees,
    recentMessages,
  ] = await Promise.all([
    getTenantById(session.tenantId),
    countUpcomingPublishedEvents(session.tenantId),
    countDevotees(session.tenantId),
    countOptedInDevotees(session.tenantId),
    countMessagesByDirection(session.tenantId, "inbound"),
    countMessagesByDirection(session.tenantId, "outbound"),
    countFailedMessages(session.tenantId),
    listEvents(session.tenantId, { status: "published", upcomingOnly: true }),
    listRecentDevotees(session.tenantId, 5),
    listRecentMessages(session.tenantId, 5),
  ]);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          Namaste 🙏 {tenant ? `— ${tenant.name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          {greeting()}. Today is {today}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Upcoming Events"
          value={upcomingEvents}
          icon={<CalendarDays className="size-4.5" />}
          gradient="gradient-saffron-gold"
        />
        <MetricCard
          label="Total Devotees"
          value={totalDevotees}
          icon={<Users className="size-4.5" />}
          gradient="gradient-blue-purple"
        />
        <MetricCard
          label="WhatsApp Opt-ins"
          value={optedInDevotees}
          icon={<MessageCircle className="size-4.5" />}
          gradient="gradient-green-emerald"
        />
        <MetricCard
          label="Messages Received"
          value={messagesReceived}
          icon={<Send className="size-4.5" />}
          gradient="bg-royal-blue"
        />
        <MetricCard
          label="Messages Sent"
          value={messagesSent}
          icon={<Megaphone className="size-4.5" />}
          gradient="gradient-maroon-orange"
        />
        <MetricCard
          label="Failed Sends"
          value={failedSends}
          icon={<AlertTriangle className="size-4.5" />}
          gradient="bg-destructive"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <UpcomingEventsWidget events={upcomingEventsList.slice(0, 5)} />
        <RecentDevoteesWidget devotees={recentDevotees} />
        <RecentMessagesWidget messages={recentMessages} />
      </div>

      <QuickActions />
    </div>
  );
}
