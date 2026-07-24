"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { UserCog } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MobileListView } from "@/components/mobile-list-view";
import { MobileListRow } from "@/components/mobile-list-row";
import { PaginationControls } from "@/components/pagination-controls";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { DeactivateSuperAdminButton } from "@/features/super-admin/deactivate-super-admin-button";
import type { SuperAdmin } from "@/types/db";

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function AdminsList({ admins, currentSuperAdminId }: { admins: SuperAdmin[]; currentSuperAdminId: string }) {
  const [page, setPage] = useState(1);
  const pagedAdmins = admins.slice((page - 1) * DEFAULT_PAGE_SIZE, page * DEFAULT_PAGE_SIZE);

  return (
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
            {pagedAdmins.map((admin) => {
              const isSelf = admin.id === currentSuperAdminId;
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
                      {admin.firebaseUid ? "Signed in" : "Not signed in yet"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatTimestamp(admin.createdAt)}</TableCell>
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
        <PaginationControls page={page} pageSize={DEFAULT_PAGE_SIZE} totalCount={admins.length} onPageChange={setPage} />
      </div>

      <div className="space-y-3 md:hidden">
        <MobileListView>
          {pagedAdmins.map((admin) => {
            const isSelf = admin.id === currentSuperAdminId;
            return (
              <MobileListRow
                key={admin.id}
                title={isSelf ? `${admin.displayName} (You)` : admin.displayName}
                subtitle={admin.phoneNumber}
                badge={
                  <Badge variant={admin.firebaseUid ? "secondary" : "outline"}>
                    {admin.firebaseUid ? "Signed in" : "Not signed in yet"}
                  </Badge>
                }
                trailing={isSelf ? undefined : <DeactivateSuperAdminButton id={admin.id} displayName={admin.displayName} />}
              />
            );
          })}
        </MobileListView>
        <PaginationControls page={page} pageSize={DEFAULT_PAGE_SIZE} totalCount={admins.length} onPageChange={setPage} />
      </div>
    </>
  );
}
