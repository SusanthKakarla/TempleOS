import { requireDashboardAdmin } from "../../require-dashboard-admin";
import { requireTenantFeature } from "@/lib/auth/features";
import { listPendingUpiDonations } from "@/lib/db/payment-transactions";
import { PendingDonationsTable } from "@/features/donations/pending-donations-table";

export default async function PendingDonationsPage() {
  const session = await requireDashboardAdmin();
  await requireTenantFeature(session.tenantId, "donations");

  const pending = await listPendingUpiDonations(session.tenantId);

  return <PendingDonationsTable donations={pending} />;
}
