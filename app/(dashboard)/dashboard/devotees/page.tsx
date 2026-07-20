import { requireDashboardAdmin } from "../require-dashboard-admin";
import { listDevotees, countDevoteesFiltered, type ListDevoteesOptions } from "@/lib/db/devotees";
import { DevoteesTable } from "@/features/devotees/devotees-table";
import { parsePageParam, DEFAULT_PAGE_SIZE } from "@/lib/pagination";

interface DevoteesPageProps {
  searchParams: Promise<{ search?: string; page?: string; sort?: string; dir?: string }>;
}

const SORT_VALUES: ListDevoteesOptions["sort"][] = ["name", "phone", "firstSeen"];

export default async function DevoteesPage({ searchParams }: DevoteesPageProps) {
  const session = await requireDashboardAdmin();

  const { search, page: pageParam, sort: sortParam, dir: dirParam } = await searchParams;
  const page = parsePageParam(pageParam);
  const sort = SORT_VALUES.find((value) => value === sortParam);
  const dir = dirParam === "desc" ? "desc" : "asc";

  const [devotees, totalCount] = await Promise.all([
    listDevotees(session.tenantId, { search, page, pageSize: DEFAULT_PAGE_SIZE, sort, dir }),
    countDevoteesFiltered(session.tenantId, { search }),
  ]);

  return (
    <DevoteesTable
      devotees={devotees}
      page={page}
      pageSize={DEFAULT_PAGE_SIZE}
      totalCount={totalCount}
      sort={sort}
      dir={dir}
    />
  );
}
