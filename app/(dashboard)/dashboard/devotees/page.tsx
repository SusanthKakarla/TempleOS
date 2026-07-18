import { requireDashboardAdmin } from "../require-dashboard-admin";
import { listDevotees } from "@/lib/db/devotees";
import { DevoteesTable } from "@/features/devotees/devotees-table";

interface DevoteesPageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function DevoteesPage({ searchParams }: DevoteesPageProps) {
  const session = await requireDashboardAdmin();

  const { search } = await searchParams;
  const devotees = await listDevotees(session.tenantId, search);

  return <DevoteesTable devotees={devotees} />;
}
