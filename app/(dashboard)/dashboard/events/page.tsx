import { getSessionAdmin } from "@/lib/auth/session";
import { listEvents } from "@/lib/db/events";
import { EventsTable } from "@/features/events/events-table";

export default async function EventsPage() {
  const session = await getSessionAdmin();
  if (!session) return null; // guarded by the dashboard layout

  const events = await listEvents(session.tenantId);

  return <EventsTable events={events} />;
}
