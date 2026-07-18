"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserPlus, Users } from "lucide-react";
import type { AdminRole, AdminUser } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminFormDialog } from "./admin-form-dialog";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function AdminsTable({ admins }: { admins: AdminUser[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const superAdminCount = admins.filter((a) => a.role === "super_admin").length;

  function refresh() {
    router.refresh();
  }

  async function handleRoleChange(admin: AdminUser, role: AdminRole) {
    if (role === admin.role) return;
    setError(null);
    setPendingId(admin.id);
    try {
      const response = await fetch(`/api/admins/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to update role");
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(admin: AdminUser) {
    if (!window.confirm(`Remove "${admin.displayName}"? They will lose dashboard access.`)) return;
    setError(null);
    setPendingId(admin.id);
    try {
      const response = await fetch(`/api/admins/${admin.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to remove admin");
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove admin");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Admins</h1>
          <p className="text-sm text-muted-foreground">
            Manage who can sign in to the TempleOS dashboard.
          </p>
        </div>
        <AdminFormDialog
          trigger={
            <Button className="hidden gap-1.5 sm:inline-flex">
              <UserPlus className="size-4" />
              Add admin
            </Button>
          }
          onSaved={refresh}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {admins.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-background py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Users className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No admins found</p>
          <p className="text-sm text-muted-foreground">Add an admin to give them dashboard access.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => {
                const isLastSuperAdmin = admin.role === "super_admin" && superAdminCount <= 1;
                return (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-royal-blue text-xs font-semibold text-white">
                            {getInitials(admin.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{admin.displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{admin.phoneNumber}</TableCell>
                    <TableCell>
                      <Select
                        value={admin.role}
                        disabled={pendingId === admin.id || isLastSuperAdmin}
                        onValueChange={(value) => handleRoleChange(admin, value as AdminRole)}
                        items={{ admin: "Admin", super_admin: "Super Admin" }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">
                            <span className="flex items-center gap-1.5">
                              <ShieldCheck className="size-3.5 text-royal-blue" />
                              Super Admin
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{formatDate(admin.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pendingId === admin.id || isLastSuperAdmin}
                        title={isLastSuperAdmin ? "Can't remove the last Super Admin" : undefined}
                        onClick={() => handleDelete(admin)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AdminFormDialog
        trigger={
          <Button size="icon-lg" className="fixed right-4 bottom-4 z-40 rounded-full shadow-lg sm:hidden">
            <UserPlus className="size-5" />
            <span className="sr-only">Add admin</span>
          </Button>
        }
        onSaved={refresh}
      />
    </div>
  );
}
