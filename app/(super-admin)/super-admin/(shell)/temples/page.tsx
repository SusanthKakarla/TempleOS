import Link from "next/link";
import { Landmark, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { TemplesList } from "@/features/super-admin/temples-list";
import { listTenantsForSuperAdmin } from "@/lib/db/tenants";
import { requireSuperAdminPage } from "../../require-super-admin";

export default async function SuperAdminTemplesPage() {
  await requireSuperAdminPage("/super-admin/temples");
  const temples = await listTenantsForSuperAdmin();

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

      {temples.length === 0 ? (
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
        <TemplesList temples={temples} />
      )}
    </div>
  );
}
