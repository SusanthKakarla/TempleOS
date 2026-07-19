import { requireDashboardAdmin } from "../../require-dashboard-admin";
import { DevoteeImportWizard } from "@/features/devotees/devotee-import-wizard";

export default async function DevoteeImportPage() {
  await requireDashboardAdmin();

  return <DevoteeImportWizard />;
}
