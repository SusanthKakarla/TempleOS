import Link from "next/link";
import { ArrowLeft, Plus, ShieldCheck, UserCog } from "lucide-react";
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
import { AmbientBackground } from "@/features/dashboard/ambient-background";
import { listActiveSuperAdmins } from "@/lib/db/super-admins";
import { SuperAdminSignOutButton } from "@/features/super-admin/super-admin-sign-out-button";
import { AddSuperAdminDialog } from "@/features/super-admin/add-super-admin-dialog";
import { DeactivateSuperAdminButton } from "@/features/super-admin/deactivate-super-admin-button";
import { requireSuperAdminPage } from "../require-super-admin";

export default async function SuperAdminAdminsPage() {
  const currentSuperAdmin = await requireSuperAdminPage("/super-admin/admins");
  const admins = await listActiveSuperAdmins();

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
      <AmbientBackground />
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-4">
          <Button variant="ghost" className="px-0" render={<Link href="/super-admin/temples" />}>
            <ArrowLeft className="size-4" />
            Temples
          </Button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Super Admin</p>
              <h1 className="text-2xl font-semibold tracking-normal">Platform Admins</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                People with full Super Admin access across every temple on this platform.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                <ShieldCheck className="size-3" />
                {admins.length} active
              </Badge>
              <SuperAdminSignOutButton />
              <AddSuperAdminDialog
                trigger={
                  <Button>
                    <Plus className="size-4" />
                    Add Super Admin
                  </Button>
                }
              />
            </div>
          </div>
        </header>

        <TableShell>
          <div className="border-b px-4 py-3">
            <h2 className="text-base font-semibold tracking-normal">Active Super Admins</h2>
            <p className="text-sm text-muted-foreground">
              Every Super Admin can manage all temples, roles, and other Super Admins.
            </p>
          </div>
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
        </TableShell>
      </div>
    </main>
  );
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
