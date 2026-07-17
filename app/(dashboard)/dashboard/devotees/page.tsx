import { getSessionAdmin } from "@/lib/auth/session";
import { listDevotees } from "@/lib/db/devotees";
import { DevoteesTable } from "@/features/devotees/devotees-table";

interface DevoteesPageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function DevoteesPage({ searchParams }: DevoteesPageProps) {
  const session = await getSessionAdmin();
  if (!session) return null; // guarded by the dashboard layout

  const { search } = await searchParams;
  const devotees = await listDevotees(session.tenantId, search);

  return <DevoteesTable devotees={devotees} />;
}
