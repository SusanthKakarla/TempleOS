import { requireDashboardAdmin } from "../require-dashboard-admin";
import { listTenantMembershipsForTenant } from "@/lib/db/tenant-memberships";
import { UsersTable } from "@/features/users/users-table";
import { isRoleCode, type TenantMembershipStatus } from "@/types/db";

interface UsersPageProps {
  searchParams: Promise<{ search?: string; status?: string; role?: string }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const session = await requireDashboardAdmin();

  const { search, status, role } = await searchParams;
  const members = await listTenantMembershipsForTenant(session.tenantId, {
    search,
    status: status === "active" || status === "inactive" ? (status as TenantMembershipStatus) : undefined,
    role: role && isRoleCode(role) ? role : undefined,
  });

  return <UsersTable members={members} currentMembershipId={session.membershipId} />;
}
