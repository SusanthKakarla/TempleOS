import { Plus, ShieldCheck, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableShell } from "@/components/table-shell";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { listActiveSuperAdmins } from "@/lib/db/super-admins";
import { AddSuperAdminDialog } from "@/features/super-admin/add-super-admin-dialog";
import { AdminsList } from "@/features/super-admin/admins-list";
import { requireSuperAdminPage } from "../../require-super-admin";

export default async function SuperAdminAdminsPage() {
  const currentSuperAdmin = await requireSuperAdminPage("/super-admin/admins");
  const admins = await listActiveSuperAdmins();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Admins"
        subtitle="People with full Super Admin access across every temple on this platform."
        actions={
          <>
            <Badge variant="secondary">
              <ShieldCheck className="size-3" />
              {admins.length} active
            </Badge>
            <AddSuperAdminDialog
              trigger={
                <Button>
                  <Plus className="size-4" />
                  Add Super Admin
                </Button>
              }
            />
          </>
        }
      />

      <TableShell>
          <div className="border-b px-4 py-3">
            <h2 className="text-base font-semibold tracking-normal">Active Super Admins</h2>
            <p className="text-sm text-muted-foreground">
              Every Super Admin can manage all temples, roles, and other Super Admins.
            </p>
          </div>
          {admins.length === 0 ? (
            <EmptyState
              icon={<UserCog className="size-6" />}
              title="No active Super Admins"
              className="rounded-none border-none py-10"
            />
          ) : (
            <AdminsList admins={admins} currentSuperAdminId={currentSuperAdmin.id} />
          )}
      </TableShell>
    </div>
  );
}
