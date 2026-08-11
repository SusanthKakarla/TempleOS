import Link from "next/link";
import { Landmark, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { TemplesList } from "@/features/super-admin/temples-list";
import { countTenantsForSuperAdmin, listTenantsForSuperAdmin } from "@/lib/db/tenants";
import { parsePageParam, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { requireSuperAdminPage } from "../../require-super-admin";

interface SuperAdminTemplesPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function SuperAdminTemplesPage({ searchParams }: SuperAdminTemplesPageProps) {
  await requireSuperAdminPage("/super-admin/temples");

  const { page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);
  const [temples, totalCount] = await Promise.all([
    listTenantsForSuperAdmin({ page, pageSize: DEFAULT_PAGE_SIZE }),
    countTenantsForSuperAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Temples"
        subtitle="Provisioned tenant records, domain setup, and first admin/member status."
        actions={
          <Button render={<Link href="/super-admin/temples/new" />}>
            <Plus className="size-4" />
            New Temple
          </Button>
        }
      />

      {totalCount === 0 ? (
        <EmptyState
          icon={<Landmark className="size-6" />}
          title="No temples provisioned"
          description="Create the first temple to assign its subdomain and first member."
          className="min-h-80"
          action={
            <Button render={<Link href="/super-admin/temples/new" />}>
              <Plus className="size-4" />
              New Temple
            </Button>
          }
        />
      ) : (
        <TemplesList temples={temples} page={page} pageSize={DEFAULT_PAGE_SIZE} totalCount={totalCount} />
      )}
    </div>
  );
}
