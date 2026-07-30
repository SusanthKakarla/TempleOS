import { requireDashboardAdmin } from "../../require-dashboard-admin";
import { requireTenantFeature } from "@/lib/auth/features";
import { DonationImportWizard } from "@/features/donations/donation-import-wizard";

export default async function DonationImportPage() {
  const session = await requireDashboardAdmin();
  await requireTenantFeature(session.tenantId, "donations");

  return <DonationImportWizard />;
}
