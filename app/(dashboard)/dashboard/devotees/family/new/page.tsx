import { requireDashboardAdmin } from "../../../require-dashboard-admin";
import { FamilyFormWizard } from "@/features/devotees/family-form-wizard";

export default async function NewFamilyPage() {
  await requireDashboardAdmin();
  return <FamilyFormWizard mode="create" />;
}
