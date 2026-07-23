"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableShell } from "@/components/table-shell";
import { EmptyState } from "@/components/empty-state";
import { SortableTableHead } from "@/components/sortable-table-head";
import { PaginationControls } from "@/components/pagination-controls";
import { PageHeader } from "@/components/page-header";
import { ExportMenu } from "@/features/export/export-menu";
import { formatDate } from "@/lib/date";
import { rowFadeIn, staggerContainer } from "@/lib/motion";
import { mergeSearchParam } from "@/lib/url-params";
import { DevoteeFormDialog } from "./devotee-form-dialog";
import { DevoteesSearchInput } from "./devotees-search-input";

const MotionTableRow = motion.create(TableRow);

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

interface DevoteesTableProps {
  devotees: Devotee[];
  page: number;
  pageSize: number;
  totalCount: number;
  sort?: "name" | "phone" | "firstSeen";
  dir: "asc" | "desc";
}

export function DevoteesTable({ devotees, page, pageSize, totalCount, sort, dir }: DevoteesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("devotees");
  const tRelationship = useTranslations("devotees.relationshipNames");
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

  function updateFilter(key: string, value: string) {
    const params = mergeSearchParam(searchParams, key, value === "all" ? null : value);
    router.replace(`${pathname}?${params.toString()}`);
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

  const registrationTypeItems: Record<string, string> = {
    all: t("filters.allRegistrationTypes"),
    individual: t("filters.individual"),
    family: t("filters.family"),
  };
  const occasionItems: Record<string, string> = {
    all: t("filters.allOccasions"),
    birthday_today: t("filters.birthdayToday"),
    birthday_week: t("filters.birthdayWeek"),
    anniversary_today: t("filters.anniversaryToday"),
    anniversary_week: t("filters.anniversaryWeek"),
  };
  const donorItems: Record<string, string> = {
    all: t("filters.allDonorStatus"),
    true: t("filters.donor"),
    false: t("filters.nonDonor"),
  };
  const whatsappItems: Record<string, string> = {
    all: t("filters.allWhatsappStatus"),
    true: t("optedIn"),
    false: t("notOptedIn"),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageHeader.title")}
        subtitle={t("pageHeader.subtitle")}
        actions={
          <>
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
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <DevoteesSearchInput />
        <Select
          value={searchParams.get("registrationType") ?? "all"}
          onValueChange={(v) => updateFilter("registrationType", v ?? "all")}
          items={registrationTypeItems}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(registrationTypeItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={searchParams.get("occasion") ?? "all"}
          onValueChange={(v) => updateFilter("occasion", v ?? "all")}
          items={occasionItems}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(occasionItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={searchParams.get("isDonor") ?? "all"}
          onValueChange={(v) => updateFilter("isDonor", v ?? "all")}
          items={donorItems}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(donorItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={searchParams.get("whatsappOptIn") ?? "all"}
          onValueChange={(v) => updateFilter("whatsappOptIn", v ?? "all")}
          items={whatsappItems}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(whatsappItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
                <SortableTableHead
                  column="name"
                  label={t("columns.name")}
                  currentSort={sort}
                  currentDir={dir}
                  pathname="/dashboard/devotees"
                />
                <SortableTableHead
                  column="phone"
                  label={t("columns.phone")}
                  currentSort={sort}
                  currentDir={dir}
                  pathname="/dashboard/devotees"
                />
                <TableHead>{t("columns.family")}</TableHead>
                <TableHead>{t("columns.whatsapp")}</TableHead>
                <TableHead>{t("columns.birthStar")}</TableHead>
                <TableHead>{t("columns.gothram")}</TableHead>
                <SortableTableHead
                  column="firstSeen"
                  label={t("columns.firstSeen")}
                  currentSort={sort}
                  currentDir={dir}
                  pathname="/dashboard/devotees"
                />
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
                  <TableCell>{devotee.whatsappPhone ?? "—"}</TableCell>
                  <TableCell>
                    {devotee.familyId ? (
                      <Link
                        href={`/dashboard/devotees/family/${devotee.familyId}/edit`}
                        className="inline-flex flex-col hover:underline"
                      >
                        <span className="text-sm font-medium">{devotee.familyName}</span>
                        {devotee.relationship && (
                          <span className="text-xs text-muted-foreground">{tRelationship(devotee.relationship)}</span>
                        )}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
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
                      variant="destructive"
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
          <PaginationControls page={page} pageSize={pageSize} totalCount={totalCount} pathname="/dashboard/devotees" />
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
