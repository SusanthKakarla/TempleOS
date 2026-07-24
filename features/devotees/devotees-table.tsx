"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { motion } from "framer-motion";
import { Download, Eye, Pencil, RotateCcw, Trash2, Upload, UserPlus, Users } from "lucide-react";
import type { Devotee, SupportedLanguage } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { OverflowActionMenu } from "@/components/overflow-action-menu";
import { FilterBottomSheet } from "@/components/filter-bottom-sheet";
import { ResponsiveSearchBar } from "@/components/responsive-search-bar";
import { MobileListView } from "@/components/mobile-list-view";
import { MobileListRow } from "@/components/mobile-list-row";
import { formatDate } from "@/lib/date";
import { maskPhoneForDisplay } from "@/lib/phone.mts";
import { rowFadeIn, staggerContainer } from "@/lib/motion";
import { mergeSearchParam } from "@/lib/url-params";
import { DevoteeFormDialog } from "./devotee-form-dialog";

const MotionTableRow = motion.create(TableRow);
const PATHNAME = "/dashboard/devotees";

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

interface PendingFilters {
  registrationType: string;
  occasion: string;
  isDonor: string;
  whatsappOptIn: string;
  status: string;
}

function filtersFromSearchParams(searchParams: URLSearchParams): PendingFilters {
  return {
    registrationType: searchParams.get("registrationType") ?? "all",
    occasion: searchParams.get("occasion") ?? "all",
    isDonor: searchParams.get("isDonor") ?? "all",
    whatsappOptIn: searchParams.get("whatsappOptIn") ?? "all",
    status: searchParams.get("status") ?? "active",
  };
}

export function DevoteesTable({ devotees, page, pageSize, totalCount, sort, dir }: DevoteesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("devotees");
  const tRelationship = useTranslations("devotees.relationshipNames");
  const tCommon = useTranslations("common");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editingDevotee, setEditingDevotee] = useState<Devotee | null>(null);
  const [deactivatingDevotee, setDeactivatingDevotee] = useState<Devotee | null>(null);
  const [pendingFilters, setPendingFilters] = useState<PendingFilters>(() => filtersFromSearchParams(searchParams));

  function refresh() {
    router.refresh();
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? devotees.map((d) => d.id) : []);
  }

  async function handleConfirmDeactivate() {
    if (!deactivatingDevotee) return;
    setError(null);
    setPendingId(deactivatingDevotee.id);
    try {
      const response = await fetch(`/api/devotees/${deactivatingDevotee.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("deactivateError"));
      }
      setDeactivatingDevotee(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deactivateError"));
    } finally {
      setPendingId(null);
    }
  }

  async function handleReactivate(devotee: Devotee) {
    setError(null);
    setPendingId(devotee.id);
    try {
      const response = await fetch(`/api/devotees/${devotee.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("reactivateError"));
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("reactivateError"));
    } finally {
      setPendingId(null);
    }
  }

  /** "status" defaults to "active" (not "all" like every other filter) — hiding it from the URL when active-only is exactly the opposite condition from the rest. */
  function applyFilters(next: PendingFilters) {
    let params: URLSearchParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      const isDefault = key === "status" ? value === "active" : value === "all";
      params = mergeSearchParam(params, key, isDefault ? null : value);
    }
    params = mergeSearchParam(params, "page", null);
    router.replace(`${PATHNAME}?${params.toString()}`);
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
  const statusItems: Record<string, string> = {
    active: t("filters.activeOnly"),
    all: t("filters.includeInactive"),
  };

  const activeFilterCount = Object.entries(filtersFromSearchParams(searchParams)).filter(
    ([key, value]) => (key === "status" ? value !== "active" : value !== "all"),
  ).length;

  function devoteeActionItems(devotee: Devotee) {
    if (!devotee.isActive) {
      return [
        {
          label: tCommon("viewDetails"),
          icon: <Eye className="size-4" />,
          onClick: () => router.push(`/dashboard/devotees/${devotee.id}`),
        },
        {
          label: t("reactivateAction"),
          icon: <RotateCcw className="size-4" />,
          disabled: pendingId === devotee.id,
          onClick: () => handleReactivate(devotee),
        },
      ];
    }
    return [
      {
        label: tCommon("viewDetails"),
        icon: <Eye className="size-4" />,
        onClick: () => router.push(`/dashboard/devotees/${devotee.id}`),
      },
      {
        label: tCommon("edit"),
        icon: <Pencil className="size-4" />,
        disabled: pendingId === devotee.id,
        onClick: () => setEditingDevotee(devotee),
      },
      {
        label: tCommon("delete"),
        icon: <Trash2 className="size-4" />,
        variant: "destructive" as const,
        disabled: pendingId === devotee.id,
        onClick: () => setDeactivatingDevotee(devotee),
      },
    ];
  }

  const filterSheetContent = (
    <div className="space-y-4 py-4">
      <div className="space-y-1.5">
        <Label>{t("filters.typeLabel")}</Label>
        <Select
          value={pendingFilters.registrationType}
          onValueChange={(v) => setPendingFilters((f) => ({ ...f, registrationType: v ?? "all" }))}
          items={registrationTypeItems}
        >
          <SelectTrigger className="w-full">
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
      </div>
      <div className="space-y-1.5">
        <Label>{t("filters.occasionLabel")}</Label>
        <Select
          value={pendingFilters.occasion}
          onValueChange={(v) => setPendingFilters((f) => ({ ...f, occasion: v ?? "all" }))}
          items={occasionItems}
        >
          <SelectTrigger className="w-full">
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
      </div>
      <div className="space-y-1.5">
        <Label>{t("filters.donorLabel")}</Label>
        <Select
          value={pendingFilters.isDonor}
          onValueChange={(v) => setPendingFilters((f) => ({ ...f, isDonor: v ?? "all" }))}
          items={donorItems}
        >
          <SelectTrigger className="w-full">
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
      </div>
      <div className="space-y-1.5">
        <Label>{t("filters.whatsappLabel")}</Label>
        <Select
          value={pendingFilters.whatsappOptIn}
          onValueChange={(v) => setPendingFilters((f) => ({ ...f, whatsappOptIn: v ?? "all" }))}
          items={whatsappItems}
        >
          <SelectTrigger className="w-full">
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
      <div className="space-y-1.5">
        <Label>{t("filters.statusLabel")}</Label>
        <Select
          value={pendingFilters.status}
          onValueChange={(v) => setPendingFilters((f) => ({ ...f, status: v ?? "active" }))}
          items={statusItems}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("pageHeader.title")}
        subtitle={t("pageHeader.subtitle")}
        actions={
          <>
            <Link
              href="/dashboard/devotees/import"
              className="hidden items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium hover:bg-muted lg:inline-flex"
            >
              <Upload className="size-4" />
              {t("importButton")}
            </Link>
            <div className="hidden lg:block">
              <ExportMenu
                exportUrl="/api/devotees/export"
                filterParams={searchParams}
                selectedIds={selectedIds}
                moduleLabel="devotees"
              />
            </div>
            <OverflowActionMenu
              label="Import / Export"
              items={[
                { label: t("importButton"), icon: <Upload className="size-4" />, onClick: () => router.push("/dashboard/devotees/import") },
                { label: "Export", icon: <Download className="size-4" />, onClick: () => setExportOpen(true) },
              ]}
            />
            {/* Rendered without its own trigger — opened programmatically from the overflow menu above (mobile/tablet path). */}
            <ExportMenu
              exportUrl="/api/devotees/export"
              filterParams={searchParams}
              selectedIds={selectedIds}
              moduleLabel="devotees"
              open={exportOpen}
              onOpenChange={setExportOpen}
              hideTrigger
            />
          </>
        }
      />

      <ResponsiveSearchBar
        pathname={PATHNAME}
        placeholder={t("searchPlaceholder")}
        filtersSlot={
          <>
            <FilterBottomSheet
              title={tCommon("filters")}
              activeCount={activeFilterCount}
              onOpenChange={(open) => {
                if (open) setPendingFilters(filtersFromSearchParams(searchParams));
              }}
              onReset={() => {
                const reset: PendingFilters = {
                  registrationType: "all",
                  occasion: "all",
                  isDonor: "all",
                  whatsappOptIn: "all",
                  status: "active",
                };
                setPendingFilters(reset);
                applyFilters(reset);
              }}
              onApply={() => applyFilters(pendingFilters)}
            >
              {filterSheetContent}
            </FilterBottomSheet>
            <DevoteeFormDialog
              mode="create"
              trigger={
                <Button className="shrink-0 gap-1.5">
                  <UserPlus className="size-4" />
                  <span className="hidden sm:inline">{t("addButton")}</span>
                </Button>
              }
              onSaved={refresh}
            />
          </>
        }
      />

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
        <>
          {/* Tablet + desktop: table, with Family/Birth Star/Gothram hidden on tablet (shown desktop-only). */}
          <div className="hidden md:block">
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
                    <SortableTableHead column="name" label={t("columns.name")} currentSort={sort} currentDir={dir} pathname={PATHNAME} />
                    <SortableTableHead column="phone" label={t("columns.phone")} currentSort={sort} currentDir={dir} pathname={PATHNAME} />
                    <TableHead className="hidden lg:table-cell">{t("columns.family")}</TableHead>
                    <TableHead>{t("columns.whatsapp")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("columns.birthStar")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("columns.gothram")}</TableHead>
                    <SortableTableHead
                      column="firstSeen"
                      label={t("columns.firstSeen")}
                      currentSort={sort}
                      currentDir={dir}
                      pathname={PATHNAME}
                      className="hidden lg:table-cell"
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
                        <Link href={`/dashboard/devotees/${devotee.id}`} className="flex items-center gap-2.5 hover:underline">
                          <Avatar className="size-8">
                            <AvatarFallback className="gradient-blue-purple text-xs font-semibold text-white">
                              {getInitials(devotee.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{devotee.displayName}</span>
                          {!devotee.isActive && <Badge variant="secondary">{t("inactiveBadge")}</Badge>}
                        </Link>
                      </TableCell>
                      <TableCell>{devotee.whatsappPhone ?? "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {devotee.familyId ? (
                          <Link href={`/dashboard/devotees/family/${devotee.familyId}/edit`} className="inline-flex flex-col hover:underline">
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
                      <TableCell className="hidden lg:table-cell">{devotee.birthStar ?? "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell">{devotee.ancestralLineage ?? "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell">{formatDate(devotee.firstSeenAt, locale)}</TableCell>
                      <TableCell className="text-right">
                        <OverflowActionMenu items={devoteeActionItems(devotee)} />
                      </TableCell>
                    </MotionTableRow>
                  ))}
                </motion.tbody>
              </Table>
              <PaginationControls page={page} pageSize={pageSize} totalCount={totalCount} pathname={PATHNAME} />
            </TableShell>
          </div>

          {/* Mobile: compact high-density list, ~64px rows. Long-press any row to enter multi-select. */}
          <div className="space-y-3 md:hidden">
            <MobileListView>
              {devotees.map((devotee) => (
                <MobileListRow
                  key={devotee.id}
                  href={`/dashboard/devotees/${devotee.id}`}
                  leading={
                    <Avatar className="size-9">
                      <AvatarFallback className="gradient-blue-purple text-xs font-semibold text-white">
                        {getInitials(devotee.displayName)}
                      </AvatarFallback>
                    </Avatar>
                  }
                  title={devotee.displayName}
                  subtitle={maskPhoneForDisplay(devotee.whatsappPhone)}
                  badge={
                    !devotee.isActive ? (
                      <Badge variant="secondary">{t("inactiveBadge")}</Badge>
                    ) : devotee.isDonor ? (
                      <Badge variant="default">{t("filters.donor")}</Badge>
                    ) : (
                      <Badge variant={devotee.whatsappOptInStatus ? "default" : "secondary"}>
                        {devotee.whatsappOptInStatus ? t("optedIn") : t("notOptedIn")}
                      </Badge>
                    )
                  }
                  trailing={<OverflowActionMenu items={devoteeActionItems(devotee)} />}
                  selectMode={selectMode}
                  selected={selectedIds.includes(devotee.id)}
                  onToggleSelect={(checked) => toggleSelected(devotee.id, checked)}
                  onLongPress={() => {
                    setSelectMode(true);
                    if (!selectedIds.includes(devotee.id)) toggleSelected(devotee.id, true);
                  }}
                />
              ))}
            </MobileListView>
            <PaginationControls page={page} pageSize={pageSize} totalCount={totalCount} pathname={PATHNAME} />
          </div>
        </>
      )}

      {editingDevotee && (
        <DevoteeFormDialog
          mode="edit"
          devotee={editingDevotee}
          trigger={<span className="hidden" />}
          open
          onOpenChange={(open) => {
            if (!open) setEditingDevotee(null);
          }}
          onSaved={() => {
            setEditingDevotee(null);
            refresh();
          }}
        />
      )}

      <AlertDialog
        open={deactivatingDevotee !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivatingDevotee(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deactivateDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivatingDevotee && t("deactivateDialog.description", { name: deactivatingDevotee.displayName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeactivatingDevotee(null)} disabled={pendingId !== null}>
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeactivate} disabled={pendingId !== null}>
              {t("deactivateDialog.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
