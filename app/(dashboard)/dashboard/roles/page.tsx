import { getTranslations } from "next-intl/server";
import { requireDashboardAdmin } from "../require-dashboard-admin";
import { listRoleDefinitionsForSuperAdmin, countActiveMembersByRole } from "@/lib/db/role-definitions";
import { RolesGrid } from "@/features/users/roles-grid";

export default async function RolesPage() {
  const session = await requireDashboardAdmin();
  const t = await getTranslations("rolesAndPermissions.pageHeader");

  const [roles, counts] = await Promise.all([
    listRoleDefinitionsForSuperAdmin(),
    countActiveMembersByRole(session.tenantId),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <RolesGrid roles={roles} counts={counts} />
    </div>
  );
}
