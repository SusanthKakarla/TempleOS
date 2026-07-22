import { requireDashboardAdmin } from "../require-dashboard-admin";
import { requireTenantFeature } from "@/lib/auth/features";
import { listEvents, countEventsFiltered, type ListEventsFilter } from "@/lib/db/events";
import { EventsTable } from "@/features/events/events-table";
import { parsePageParam, DEFAULT_PAGE_SIZE } from "@/lib/pagination";

interface EventsPageProps {
  searchParams: Promise<{ page?: string; sort?: string; dir?: string }>;
}

const SORT_VALUES: ListEventsFilter["sort"][] = ["date", "title", "status"];

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const session = await requireDashboardAdmin();
  await requireTenantFeature(session.tenantId, "events");

  const { page: pageParam, sort: sortParam, dir: dirParam } = await searchParams;
  const page = parsePageParam(pageParam);
  const sort = SORT_VALUES.find((value) => value === sortParam);
  const dir = dirParam === "desc" ? "desc" : "asc";

  const [events, totalCount] = await Promise.all([
    listEvents(session.tenantId, { page, pageSize: DEFAULT_PAGE_SIZE, sort, dir }),
    countEventsFiltered(session.tenantId),
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
