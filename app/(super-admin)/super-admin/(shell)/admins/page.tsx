import { Plus, ShieldCheck, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableShell } from "@/components/table-shell";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { MobileListView } from "@/components/mobile-list-view";
import { MobileListRow } from "@/components/mobile-list-row";
import { listActiveSuperAdmins } from "@/lib/db/super-admins";
import { AddSuperAdminDialog } from "@/features/super-admin/add-super-admin-dialog";
import { DeactivateSuperAdminButton } from "@/features/super-admin/deactivate-super-admin-button";
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
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Sign-in</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => {
                      const isSelf = admin.id === currentSuperAdmin.id;
                      return (
                        <TableRow key={admin.id}>
                          <TableCell className="font-medium">
                            <span className="inline-flex items-center gap-2">
                              <UserCog className="size-4 text-muted-foreground" />
                              {admin.displayName}
                              {isSelf && <Badge variant="outline">You</Badge>}
                            </span>
                          </TableCell>
                          <TableCell>{admin.phoneNumber}</TableCell>
                          <TableCell>
                            <Badge variant={admin.firebaseUid ? "secondary" : "outline"}>
                              {admin.firebaseUid ? "Linked" : "Not signed in yet"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatTimestamp(admin.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            {isSelf ? (
                              <span className="text-xs text-muted-foreground">Cannot remove yourself</span>
                            ) : (
                              <DeactivateSuperAdminButton id={admin.id} displayName={admin.displayName} />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden">
                <MobileListView>
                  {admins.map((admin) => {
                    const isSelf = admin.id === currentSuperAdmin.id;
                    return (
                      <MobileListRow
                        key={admin.id}
                        title={isSelf ? `${admin.displayName} (You)` : admin.displayName}
                        subtitle={admin.phoneNumber}
                        badge={
                          <Badge variant={admin.firebaseUid ? "secondary" : "outline"}>
                            {admin.firebaseUid ? "Linked" : "Not signed in yet"}
                          </Badge>
                        }
                        trailing={
                          isSelf ? undefined : (
                            <DeactivateSuperAdminButton id={admin.id} displayName={admin.displayName} />
                          )
                        }
                      />
                    );
                  })}
                </MobileListView>
              </div>
            </>
          )}
      </TableShell>
    </div>
  );
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
