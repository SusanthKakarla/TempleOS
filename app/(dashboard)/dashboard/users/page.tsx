import { requireDashboardAdmin } from "../require-dashboard-admin";
import {
  listTenantMembershipsForTenant,
  countTenantMembershipsFiltered,
  type ListTenantMembershipsFilters,
} from "@/lib/db/tenant-memberships";
import { UsersTable } from "@/features/users/users-table";
import { isRoleCode, type TenantMembershipStatus } from "@/types/db";
import { parsePageParam, DEFAULT_PAGE_SIZE } from "@/lib/pagination";

interface UsersPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    role?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
}

const SORT_VALUES: ListTenantMembershipsFilters["sort"][] = ["name", "status", "lastSignIn"];

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const session = await requireDashboardAdmin();

  const { search, status, role, page: pageParam, sort: sortParam, dir: dirParam } = await searchParams;
  const page = parsePageParam(pageParam);
  const sort = SORT_VALUES.find((value) => value === sortParam);
  const dir = dirParam === "desc" ? "desc" : "asc";

  const filters: ListTenantMembershipsFilters = {
    search,
    status: status === "active" || status === "inactive" ? (status as TenantMembershipStatus) : undefined,
    role: role && isRoleCode(role) ? role : undefined,
  };

  const [members, totalCount] = await Promise.all([
    listTenantMembershipsForTenant(session.tenantId, { ...filters, page, pageSize: DEFAULT_PAGE_SIZE, sort, dir }),
    countTenantMembershipsFiltered(session.tenantId, filters),
  ]);

  return (
    <UsersTable
      members={members}
      currentMembershipId={session.membershipId}
      page={page}
      pageSize={DEFAULT_PAGE_SIZE}
      totalCount={totalCount}
      sort={sort}
      dir={dir}
    />
  );
}
