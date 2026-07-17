import { getSessionAdmin } from "@/lib/auth/session";
import { listRecentMessages } from "@/lib/db/whatsapp-messages";
import { ActivityFeed } from "@/features/whatsapp/activity-feed";

export default async function WhatsAppActivityPage() {
  const session = await getSessionAdmin();
  if (!session) return null; // guarded by the dashboard layout

  const messages = await listRecentMessages(session.tenantId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">WhatsApp Activity</h1>
        <p className="text-sm text-muted-foreground">
          Recent inbound and outbound messages with the temple WhatsApp number.
        </p>
      </div>
      <ActivityFeed messages={messages} />
    </div>
  );
}
