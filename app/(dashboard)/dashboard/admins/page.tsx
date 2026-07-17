import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/session";
import { listAdmins } from "@/lib/db/admin-users";
import { AdminsTable } from "@/features/admins/admins-table";

export default async function AdminsPage() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    redirect("/dashboard");
  }

  const admins = await listAdmins(admin.tenantId);

  return <AdminsTable admins={admins} />;
}
