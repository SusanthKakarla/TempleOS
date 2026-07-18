import { redirect } from "next/navigation";
import { requireLegacyTenantSuperAdmin } from "@/lib/auth/session";
import { listAdmins } from "@/lib/db/admin-users";
import { AdminsTable } from "@/features/admins/admins-table";

export default async function AdminsPage() {
  const admin = await requireLegacyTenantSuperAdmin();
  if (!admin) {
    redirect("/dashboard");
  }

  const admins = await listAdmins(admin.tenantId);

  return <AdminsTable admins={admins} />;
}
