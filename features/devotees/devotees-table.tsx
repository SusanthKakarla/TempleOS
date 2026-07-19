"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Upload, UserPlus, Users } from "lucide-react";
import type { Devotee } from "@/types/db";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportMenu } from "@/features/export/export-menu";
import { DevoteeFormDialog } from "./devotee-form-dialog";
import { DevoteesSearchInput } from "./devotees-search-input";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function DevoteesTable({ devotees }: { devotees: Devotee[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function refresh() {
    router.refresh();
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? devotees.map((d) => d.id) : []);
  }

  async function handleDelete(devotee: Devotee) {
    if (
      !window.confirm(
        `Delete "${devotee.displayName}"? This cannot be undone. Their WhatsApp activity history is kept but will no longer be linked to a name.`,
      )
    ) {
      return;
    }
    setError(null);
    setPendingId(devotee.id);
    try {
      const response = await fetch(`/api/devotees/${devotee.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete devotee");
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete devotee");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Devotees</h1>
          <p className="text-sm text-muted-foreground">
            Devotees who message the temple WhatsApp number, plus any you add manually.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/devotees/import" className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
            <Upload className="size-4" />
            Import
          </Link>
          <ExportMenu
            exportUrl="/api/devotees/export"
            filterParams={searchParams}
            selectedIds={selectedIds}
            moduleLabel="devotees"
          />
          <DevoteeFormDialog
            mode="create"
            trigger={
              <Button className="hidden gap-1.5 sm:inline-flex">
                <UserPlus className="size-4" />
                Add devotee
              </Button>
            }
            onSaved={refresh}
          />
        </div>
      </div>

      <DevoteesSearchInput />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {devotees.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-background py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Users className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No devotees found</p>
          <p className="text-sm text-muted-foreground">
            Devotees appear here once they message the temple WhatsApp number, or you can add one
            manually.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.length > 0 && selectedIds.length === devotees.length}
                    onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                    aria-label="Select all devotees"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Birth star</TableHead>
                <TableHead>Gothram</TableHead>
                <TableHead>First seen</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devotees.map((devotee) => (
                <TableRow key={devotee.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(devotee.id)}
                      onCheckedChange={(checked) => toggleSelected(devotee.id, checked === true)}
                      aria-label={`Select ${devotee.displayName}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/devotees/${devotee.id}`}
                      className="flex items-center gap-2.5 hover:underline"
                    >
                      <Avatar className="size-8">
                        <AvatarFallback className="gradient-blue-purple text-xs font-semibold text-white">
                          {getInitials(devotee.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{devotee.displayName}</span>
                    </Link>
                  </TableCell>
                  <TableCell>{devotee.whatsappPhone}</TableCell>
                  <TableCell>
                    <Badge variant={devotee.whatsappOptInStatus ? "default" : "secondary"}>
                      {devotee.whatsappOptInStatus ? "Opted in" : "Not opted in"}
                    </Badge>
                  </TableCell>
                  <TableCell>{devotee.birthStar ?? "—"}</TableCell>
                  <TableCell>{devotee.ancestralLineage ?? "—"}</TableCell>
                  <TableCell>{formatDate(devotee.firstSeenAt)}</TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <DevoteeFormDialog
                      mode="edit"
                      devotee={devotee}
                      trigger={
                        <Button variant="outline" size="sm" disabled={pendingId === devotee.id}>
                          Edit
                        </Button>
                      }
                      onSaved={refresh}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pendingId === devotee.id}
                      onClick={() => handleDelete(devotee)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DevoteeFormDialog
        mode="create"
        trigger={
          <Button size="icon-lg" className="fixed right-4 bottom-4 z-40 rounded-full shadow-lg sm:hidden">
            <UserPlus className="size-5" />
            <span className="sr-only">Add devotee</span>
          </Button>
        }
        onSaved={refresh}
      />
    </div>
  );
}
