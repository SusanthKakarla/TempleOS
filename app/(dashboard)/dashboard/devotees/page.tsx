import { requireDashboardAdmin } from "../require-dashboard-admin";
import { listDevotees, countDevoteesFiltered, type ListDevoteesOptions } from "@/lib/db/devotees";
import { getTenantById } from "@/lib/db/tenants";
import { DevoteesTable } from "@/features/devotees/devotees-table";
import { parsePageParam, DEFAULT_PAGE_SIZE } from "@/lib/pagination";

interface DevoteesPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
    sort?: string;
    dir?: string;
    registrationType?: string;
    occasion?: string;
    isDonor?: string;
    whatsappOptIn?: string;
  }>;
}

const SORT_VALUES: ListDevoteesOptions["sort"][] = ["name", "phone", "firstSeen"];
const REGISTRATION_TYPE_VALUES: NonNullable<ListDevoteesOptions["registrationType"]>[] = ["individual", "family"];
const OCCASION_VALUES: NonNullable<ListDevoteesOptions["occasion"]>[] = [
  "birthday_today",
  "birthday_week",
  "anniversary_today",
  "anniversary_week",
];

export default async function DevoteesPage({ searchParams }: DevoteesPageProps) {
  const session = await requireDashboardAdmin();

  const {
    search,
    page: pageParam,
    sort: sortParam,
    dir: dirParam,
    registrationType: registrationTypeParam,
    occasion: occasionParam,
    isDonor: isDonorParam,
    whatsappOptIn: whatsappOptInParam,
  } = await searchParams;
  const page = parsePageParam(pageParam);
  const sort = SORT_VALUES.find((value) => value === sortParam);
  const dir = dirParam === "desc" ? "desc" : "asc";
  const registrationType = REGISTRATION_TYPE_VALUES.find((value) => value === registrationTypeParam);
  const occasion = OCCASION_VALUES.find((value) => value === occasionParam);
  const isDonor = isDonorParam === "true" ? true : isDonorParam === "false" ? false : undefined;
  const whatsappOptIn = whatsappOptInParam === "true" ? true : whatsappOptInParam === "false" ? false : undefined;

  const tenant = await getTenantById(session.tenantId);
  const filterOptions = { search, registrationType, isDonor, whatsappOptIn, occasion, timezone: tenant?.timezone };

  const [devotees, totalCount] = await Promise.all([
    listDevotees(session.tenantId, { ...filterOptions, page, pageSize: DEFAULT_PAGE_SIZE, sort, dir }),
    countDevoteesFiltered(session.tenantId, filterOptions),
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
