import { getTranslations } from "next-intl/server";
import { requireDashboardAdmin } from "../require-dashboard-admin";
import { listRoleDefinitionsForSuperAdmin, countActiveMembersByRole } from "@/lib/db/role-definitions";
import { RolesGrid } from "@/features/users/roles-grid";
import { PageHeader } from "@/components/page-header";

export default async function RolesPage() {
  const session = await requireDashboardAdmin();
  const t = await getTranslations("rolesAndPermissions.pageHeader");

  const [roles, counts] = await Promise.all([
    listRoleDefinitionsForSuperAdmin(),
    countActiveMembersByRole(session.tenantId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <RolesGrid roles={roles} counts={counts} />
    </div>
  );
}
