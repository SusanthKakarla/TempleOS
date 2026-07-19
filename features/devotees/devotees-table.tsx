"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { motion } from "framer-motion";
import { Upload, UserPlus, Users } from "lucide-react";
import type { Devotee, SupportedLanguage } from "@/types/db";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableShell } from "@/components/table-shell";
import { EmptyState } from "@/components/empty-state";
import { ExportMenu } from "@/features/export/export-menu";
import { formatDate } from "@/lib/date";
import { rowFadeIn, staggerContainer } from "@/lib/motion";
import { DevoteeFormDialog } from "./devotee-form-dialog";
import { DevoteesSearchInput } from "./devotees-search-input";

const MotionTableRow = motion.create(TableRow);

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function DevoteesTable({ devotees }: { devotees: Devotee[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("devotees");
  const tCommon = useTranslations("common");
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
    if (!window.confirm(t("confirmDelete", { name: devotee.displayName }))) {
      return;
    }
    setError(null);
    setPendingId(devotee.id);
    try {
      const response = await fetch(`/api/devotees/${devotee.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("deleteError"));
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deleteError"));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{t("pageHeader.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("pageHeader.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/devotees/import" className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
            <Upload className="size-4" />
            {t("importButton")}
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
                {t("addButton")}
              </Button>
            }
            onSaved={refresh}
          />
        </div>
      </div>

      <DevoteesSearchInput />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {devotees.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title={t("emptyState.title")}
          description={t("emptyState.description")}
          action={
            <DevoteeFormDialog
              mode="create"
              trigger={
                <Button className="gap-1.5">
                  <UserPlus className="size-4" />
                  {t("addButton")}
                </Button>
              }
              onSaved={refresh}
            />
          }
        />
      ) : (
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.length > 0 && selectedIds.length === devotees.length}
                    onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                    aria-label={t("selectAll")}
                  />
                </TableHead>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.phone")}</TableHead>
                <TableHead>{t("columns.whatsapp")}</TableHead>
                <TableHead>{t("columns.birthStar")}</TableHead>
                <TableHead>{t("columns.gothram")}</TableHead>
                <TableHead>{t("columns.firstSeen")}</TableHead>
                <TableHead className="text-right">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <motion.tbody initial="hidden" animate="show" variants={staggerContainer()}>
              {devotees.map((devotee) => (
                <MotionTableRow key={devotee.id} variants={rowFadeIn}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(devotee.id)}
                      onCheckedChange={(checked) => toggleSelected(devotee.id, checked === true)}
                      aria-label={t("selectRow", { name: devotee.displayName })}
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
                      {devotee.whatsappOptInStatus ? t("optedIn") : t("notOptedIn")}
                    </Badge>
                  </TableCell>
                  <TableCell>{devotee.birthStar ?? "—"}</TableCell>
                  <TableCell>{devotee.ancestralLineage ?? "—"}</TableCell>
                  <TableCell>{formatDate(devotee.firstSeenAt, locale)}</TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <DevoteeFormDialog
                      mode="edit"
                      devotee={devotee}
                      trigger={
                        <Button variant="outline" size="sm" disabled={pendingId === devotee.id}>
                          {tCommon("edit")}
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
                      {tCommon("delete")}
                    </Button>
                  </TableCell>
                </MotionTableRow>
              ))}
            </motion.tbody>
          </Table>
        </TableShell>
      )}

      <DevoteeFormDialog
        mode="create"
        trigger={
          <Button size="icon-lg" className="fixed right-4 bottom-4 z-40 rounded-full shadow-lg sm:hidden">
            <UserPlus className="size-5" />
            <span className="sr-only">{t("addButton")}</span>
          </Button>
        }
        onSaved={refresh}
      />
    </div>
  );
}
