import { requireDashboardAdmin } from "../require-dashboard-admin";
import { requireTenantFeature } from "@/lib/auth/features";
import { listDonations, countDonationsFiltered, getDonationSummary, type ListDonationsFilter } from "@/lib/db/donations";
import { listDevotees } from "@/lib/db/devotees";
import { DonationsTable } from "@/features/donations/donations-table";
import { parsePageParam, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { getLocaleCookie } from "@/lib/i18n/locale";
import { toEnglishSearchQuery } from "@/lib/i18n/search-query";
import { translateFields } from "@/lib/i18n/translate-rows";
import { resolveDonationPurposes } from "@/lib/donations/resolve-purpose";

interface DonationsPageProps {
  searchParams: Promise<{
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    purpose?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
}

const SORT_VALUES: ListDonationsFilter["sort"][] = ["date", "amount", "donor"];

export default async function DonationsPage({ searchParams }: DonationsPageProps) {
  const session = await requireDashboardAdmin();
  await requireTenantFeature(session.tenantId, "donations");

  const { search, dateFrom, dateTo, purpose, page: pageParam, sort: sortParam, dir: dirParam } = await searchParams;
  const page = parsePageParam(pageParam);
  const sort = SORT_VALUES.find((value) => value === sortParam);
  const dir = dirParam === "asc" ? "asc" : "desc";

  const locale = await getLocaleCookie();
  const translatedSearch = search ? await toEnglishSearchQuery(search) : search;

  const [donationsRaw, totalCount, devotees, summary] = await Promise.all([
    listDonations(session.tenantId, {
      search: translatedSearch,
      dateFrom,
      dateTo,
      purpose,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      sort,
      dir,
    }),
    countDonationsFiltered(session.tenantId, { search: translatedSearch, dateFrom, dateTo, purpose }),
    listDevotees(session.tenantId),
    getDonationSummary(session.tenantId),
  ]);
  const donationsWithPurposes = await resolveDonationPurposes(donationsRaw, locale);
  const donations = await translateFields(donationsWithPurposes, locale, ["donorName"]);

  return (
    <DonationsTable
      donations={donations}
      devotees={devotees}
      page={page}
      pageSize={DEFAULT_PAGE_SIZE}
      totalCount={totalCount}
      sort={sort}
      dir={dir}
      summary={summary}
    />
  );
}
