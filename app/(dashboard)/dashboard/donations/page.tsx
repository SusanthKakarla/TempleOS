import { requireDashboardAdmin } from "../require-dashboard-admin";
import { requireTenantFeature } from "@/lib/auth/features";
import { listDonations, countDonationsFiltered, type ListDonationsFilter } from "@/lib/db/donations";
import { listDevotees } from "@/lib/db/devotees";
import { DonationsTable } from "@/features/donations/donations-table";
import { parsePageParam, DEFAULT_PAGE_SIZE } from "@/lib/pagination";

interface DonationsPageProps {
  searchParams: Promise<{
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
}

const SORT_VALUES: ListDonationsFilter["sort"][] = ["date", "amount", "donor"];

export default async function DonationsPage({ searchParams }: DonationsPageProps) {
  const session = await requireDashboardAdmin();
  await requireTenantFeature(session.tenantId, "donations");

  const { search, dateFrom, dateTo, page: pageParam, sort: sortParam, dir: dirParam } = await searchParams;
  const page = parsePageParam(pageParam);
  const sort = SORT_VALUES.find((value) => value === sortParam);
  const dir = dirParam === "asc" ? "asc" : "desc";

  const [donations, totalCount, devotees] = await Promise.all([
    listDonations(session.tenantId, { search, dateFrom, dateTo, page, pageSize: DEFAULT_PAGE_SIZE, sort, dir }),
    countDonationsFiltered(session.tenantId, { search, dateFrom, dateTo }),
    listDevotees(session.tenantId),
  ]);

  return (
    <DonationsTable
      donations={donations}
      devotees={devotees}
      page={page}
      pageSize={DEFAULT_PAGE_SIZE}
      totalCount={totalCount}
      sort={sort}
      dir={dir}
    />
  );
}
