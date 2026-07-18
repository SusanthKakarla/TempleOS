import { requireDashboardAdmin } from "../require-dashboard-admin";
import { listDonations } from "@/lib/db/donations";
import { listDevotees } from "@/lib/db/devotees";
import { DonationsTable } from "@/features/donations/donations-table";

interface DonationsPageProps {
  searchParams: Promise<{ search?: string; dateFrom?: string; dateTo?: string }>;
}

export default async function DonationsPage({ searchParams }: DonationsPageProps) {
  const session = await requireDashboardAdmin();

  const { search, dateFrom, dateTo } = await searchParams;
  const [donations, devotees] = await Promise.all([
    listDonations(session.tenantId, { search, dateFrom, dateTo }),
    listDevotees(session.tenantId),
  ]);

  return <DonationsTable donations={donations} devotees={devotees} />;
}
