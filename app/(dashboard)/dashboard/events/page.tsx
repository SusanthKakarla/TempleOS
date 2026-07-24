import { requireDashboardAdmin } from "../require-dashboard-admin";
import { requireTenantFeature } from "@/lib/auth/features";
import { listEvents, countEventsFiltered, type ListEventsFilter } from "@/lib/db/events";
import type { EventStatus } from "@/types/db";
import { EventsTable } from "@/features/events/events-table";
import { parsePageParam, DEFAULT_PAGE_SIZE } from "@/lib/pagination";

interface EventsPageProps {
  searchParams: Promise<{ page?: string; sort?: string; dir?: string; when?: string; status?: string }>;
}

const SORT_VALUES: ListEventsFilter["sort"][] = ["date", "title", "status"];
const STATUS_VALUES: EventStatus[] = ["published", "draft", "cancelled"];

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const session = await requireDashboardAdmin();
  await requireTenantFeature(session.tenantId, "events");

  const { page: pageParam, sort: sortParam, dir: dirParam, when, status: statusParam } = await searchParams;
  const page = parsePageParam(pageParam);
  const sort = SORT_VALUES.find((value) => value === sortParam);
  const dir = dirParam === "desc" ? "desc" : "asc";
  const upcomingOnly = when === "upcoming";
  const status = STATUS_VALUES.find((value) => value === statusParam);

  const [events, totalCount] = await Promise.all([
    listEvents(session.tenantId, { page, pageSize: DEFAULT_PAGE_SIZE, sort, dir, upcomingOnly, status }),
    countEventsFiltered(session.tenantId, { upcomingOnly, status }),
  ]);

  return (
    <EventsTable
      events={events}
      page={page}
      pageSize={DEFAULT_PAGE_SIZE}
      totalCount={totalCount}
      sort={sort}
      dir={dir}
    />
  );
}
