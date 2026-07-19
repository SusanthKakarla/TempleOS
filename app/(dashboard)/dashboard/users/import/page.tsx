import { requireDashboardAdmin } from "../../require-dashboard-admin";
import { UserImportWizard } from "@/features/users/user-import-wizard";

export default async function UserImportPage() {
  await requireDashboardAdmin();

  return <UserImportWizard />;
}
