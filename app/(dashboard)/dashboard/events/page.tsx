import { requireDashboardAdmin } from "../require-dashboard-admin";
import { listEvents } from "@/lib/db/events";
import { EventsTable } from "@/features/events/events-table";

export default async function EventsPage() {
  const session = await requireDashboardAdmin();

  const events = await listEvents(session.tenantId);

  return <EventsTable events={events} />;
}
