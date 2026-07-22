import { requireSuperAdminPage } from "../require-super-admin";
import { SuperAdminShell } from "@/features/super-admin/super-admin-shell";

export default async function SuperAdminShellLayout({ children }: { children: React.ReactNode }) {
  const superAdmin = await requireSuperAdminPage();
  return <SuperAdminShell superAdmin={superAdmin}>{children}</SuperAdminShell>;
}
