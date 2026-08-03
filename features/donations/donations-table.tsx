"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CalendarRange, Eye, HandCoins, Pencil, Plus, Trash2, Upload } from "lucide-react";
import type { Devotee, DonationSummary, DonationWithDonor, SupportedLanguage } from "@/types/db";
import { MetricCard } from "@/features/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableShell } from "@/components/table-shell";
import { StickyToolbar } from "@/components/sticky-toolbar";
import { EmptyState } from "@/components/empty-state";
import { SortableTableHead } from "@/components/sortable-table-head";
import { PaginationControls } from "@/components/pagination-controls";
import { PageHeader } from "@/components/page-header";
import { OverflowActionMenu } from "@/components/overflow-action-menu";
import { FilterBottomSheet } from "@/components/filter-bottom-sheet";
import { ResponsiveSearchBar } from "@/components/responsive-search-bar";
import { BulkActionToolbar } from "@/components/bulk-action-toolbar";
import { BulkDeleteDialog } from "@/components/bulk-delete-dialog";
import { formatDonationAmount } from "@/lib/currency";
import { formatDate, parseISODate, toISODateString } from "@/lib/date";
import { rowFadeIn, staggerContainer } from "@/lib/motion";
import { mergeSearchParam } from "@/lib/url-params";
import { ExportMenu } from "@/features/export/export-menu";
import { DONATION_PURPOSE_PRESETS, PAYMENT_METHOD_OPTIONS } from "./donation-options";
import { DonationFormDialog } from "./donation-form-dialog";

const MotionTableRow = motion.create(TableRow);
const PATHNAME = "/dashboard/donations";

type DatePreset = "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth" | "thisYear" | "custom";

function rangeForPreset(preset: DatePreset): { dateFrom: string; dateTo: string } | null {
  const today = new Date();
  const todayIso = toISODateString(today);
  switch (preset) {
    case "today":
      return { dateFrom: todayIso, dateTo: todayIso };
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { dateFrom: toISODateString(yesterday), dateTo: toISODateString(yesterday) };
    }
    case "last7": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { dateFrom: toISODateString(from), dateTo: todayIso };
    }
    case "last30": {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { dateFrom: toISODateString(from), dateTo: todayIso };
    }
    case "thisMonth": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: toISODateString(from), dateTo: todayIso };
    }
    case "lastMonth": {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return { dateFrom: toISODateString(from), dateTo: toISODateString(to) };
    }
    case "thisYear": {
      const from = new Date(today.getFullYear(), 0, 1);
      return { dateFrom: toISODateString(from), dateTo: todayIso };
    }
    case "custom":
      return null;
  }
}

const DATE_PRESETS: DatePreset[] = ["today", "yesterday", "last7", "last30", "thisMonth", "lastMonth", "thisYear", "custom"];

interface DonationsTableProps {
  donations: DonationWithDonor[];
  devotees: Devotee[];
  page: number;
  pageSize: number;
  totalCount: number;
  sort?: "date" | "amount" | "donor";
  dir: "asc" | "desc";
  summary: DonationSummary;
}

interface PendingFilters {
  preset: DatePreset;
  dateFrom: string;
  dateTo: string;
  purpose: string;
}

/** Highlights the matching preset radio when the applied range happens to equal one — falls back to "custom" (e.g. for an open-ended or hand-picked range). */
function presetForRange(dateFrom: string, dateTo: string): DatePreset {
  if (!dateFrom && !dateTo) return "custom";
  for (const preset of DATE_PRESETS) {
    if (preset === "custom") continue;
    const range = rangeForPreset(preset);
    if (range && range.dateFrom === dateFrom && range.dateTo === dateTo) return preset;
  }
  return "custom";
}

function filtersFromSearchParams(searchParams: URLSearchParams): PendingFilters {
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  return {
    preset: presetForRange(dateFrom, dateTo),
    dateFrom,
    dateTo,
    purpose: searchParams.get("purpose") ?? "all",
  };
}

export function DonationsTable({ donations, devotees, page, pageSize, totalCount, sort, dir, summary }: DonationsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("donations");
  const tCommon = useTranslations("common");

  function paymentMethodLabel(value: string | null, itemDescription: string | null): string {
    if (itemDescription) return t("nonCashBadge");
    if (!value) return "—";
    const option = PAYMENT_METHOD_OPTIONS.find((o) => o.value === value);
    return option ? t(`paymentMethods.${option.value}`) : value;
  }

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingDonation, setEditingDonation] = useState<DonationWithDonor | null>(null);
  const [pendingFilters, setPendingFilters] = useState<PendingFilters>(() => filtersFromSearchParams(searchParams));
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllPending, setDeleteAllPending] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? donations.map((d) => d.id) : []);
  }

  function refresh() {
    router.refresh();
  }

  async function handleDelete(donation: DonationWithDonor) {
    if (!window.confirm(t("confirmDelete", { amount: formatDonationAmount(donation.amount), name: donorDisplayName(donation) }))) {
      return;
    }
    setError(null);
    setPendingId(donation.id);
    try {
      const response = await fetch(`/api/donations/${donation.id}`, { method: "DELETE" });
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

  async function handleBulkDelete() {
    setBulkDeleteError(null);
    setBulkDeleting(true);
    try {
      const response = await fetch("/api/donations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("bulkDelete.error"));
      }
      toast.success(t("bulkDelete.successToast", { count: selectedIds.length }));
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      refresh();
    } catch (err) {
      setBulkDeleteError(err instanceof Error ? err.message : t("bulkDelete.error"));
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleDeleteAll() {
    setDeleteAllError(null);
    setDeleteAllPending(true);
    try {
      const response = await fetch("/api/donations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("deleteAll.error"));
      }
      const body = (await response.json().catch(() => ({}))) as { deleted?: number };
      toast.success(t("deleteAll.successToast", { count: body.deleted ?? 0 }));
      setSelectedIds([]);
      setDeleteAllOpen(false);
      refresh();
    } catch (err) {
      setDeleteAllError(err instanceof Error ? err.message : t("deleteAll.error"));
    } finally {
      setDeleteAllPending(false);
    }
  }

  function applyFilters(next: PendingFilters) {
    const range = next.preset === "custom" ? { dateFrom: next.dateFrom, dateTo: next.dateTo } : rangeForPreset(next.preset);
    let params: URLSearchParams = new URLSearchParams(searchParams);
    params = mergeSearchParam(params, "dateFrom", range?.dateFrom || null);
    params = mergeSearchParam(params, "dateTo", range?.dateTo || null);
    params = mergeSearchParam(params, "purpose", next.purpose === "all" ? null : next.purpose);
    params = mergeSearchParam(params, "page", null);
    router.replace(`${PATHNAME}?${params.toString()}`);
  }

  const purposeItems: Record<string, string> = {
    all: t("filters.allPurposes"),
    ...Object.fromEntries(DONATION_PURPOSE_PRESETS.map((preset) => [preset, preset])),
  };
  const presetLabels: Record<DatePreset, string> = {
    today: t("filters.presetToday"),
    yesterday: t("filters.presetYesterday"),
    last7: t("filters.presetLast7"),
    last30: t("filters.presetLast30"),
    thisMonth: t("filters.presetThisMonth"),
    lastMonth: t("filters.presetLastMonth"),
    thisYear: t("filters.presetThisYear"),
    custom: t("filters.presetCustom"),
  };

  const activeFilterCount = [
    searchParams.get("dateFrom") || searchParams.get("dateTo") ? 1 : 0,
    searchParams.get("purpose") ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  /** Only meaningful for "custom" — presets always produce an already-ordered range. */
  const customRangeInvalid =
    pendingFilters.preset === "custom" &&
    Boolean(pendingFilters.dateFrom) &&
    Boolean(pendingFilters.dateTo) &&
    pendingFilters.dateFrom > pendingFilters.dateTo;

  function donationActionItems(donation: DonationWithDonor) {
    return [
      ...(donation.devoteeId
        ? [
            {
              label: tCommon("viewDetails"),
              icon: <Eye className="size-4" />,
              onClick: () => router.push(`/dashboard/devotees/${donation.devoteeId}`),
            },
          ]
        : []),
      {
        label: tCommon("edit"),
        icon: <Pencil className="size-4" />,
        disabled: pendingId === donation.id,
        onClick: () => setEditingDonation(donation),
      },
      {
        label: tCommon("delete"),
        icon: <Trash2 className="size-4" />,
        variant: "destructive" as const,
        disabled: pendingId === donation.id,
        onClick: () => handleDelete(donation),
      },
    ];
  }

  /** Manual (non-registered) donors have no devotee record — no link, and "Anonymous" overrides the stored name for display only (the real name is still kept for record-keeping). */
  function donorDisplayName(donation: DonationWithDonor): string {
    return donation.isAnonymous ? t("anonymousDonor") : donation.donorName;
  }

  const filterSheetContent = (
    <div className="space-y-5 py-4">
      <div className="space-y-2">
        <Label>{t("filters.dateRangeLabel")}</Label>
        <RadioGroup
          value={pendingFilters.preset}
          onValueChange={(v) => {
            const preset = v as DatePreset;
            const range = preset === "custom" ? null : rangeForPreset(preset);
            setPendingFilters((f) => ({
              ...f,
              preset,
              dateFrom: range?.dateFrom ?? f.dateFrom,
              dateTo: range?.dateTo ?? f.dateTo,
            }));
          }}
          className="gap-0 divide-y divide-border rounded-lg border"
        >
          {DATE_PRESETS.map((preset) => (
            <label
              key={preset}
              htmlFor={`date-preset-${preset}`}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/50"
            >
              <RadioGroupItem id={`date-preset-${preset}`} value={preset} />
              {presetLabels[preset]}
            </label>
          ))}
        </RadioGroup>
        {pendingFilters.preset === "custom" && (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("dateFromLabel")}</Label>
                <DatePicker
                  value={pendingFilters.dateFrom}
                  onChange={(value) => setPendingFilters((f) => ({ ...f, dateFrom: value }))}
                  maxDate={pendingFilters.dateTo ? parseISODate(pendingFilters.dateTo) : undefined}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("dateToLabel")}</Label>
                <DatePicker
                  value={pendingFilters.dateTo}
                  onChange={(value) => setPendingFilters((f) => ({ ...f, dateTo: value }))}
                  minDate={pendingFilters.dateFrom ? parseISODate(pendingFilters.dateFrom) : undefined}
                />
              </div>
            </div>
            {customRangeInvalid && <p className="text-xs text-destructive">{t("filters.invalidRange")}</p>}
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>{t("columns.purpose")}</Label>
        <Select
          value={pendingFilters.purpose}
          onValueChange={(v) => setPendingFilters((f) => ({ ...f, purpose: v ?? "all" }))}
          items={purposeItems}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(purposeItems).map(([value, label]) => (
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
    <div className="space-y-6">
      <StickyToolbar>
      <PageHeader
        title={t("pageHeader.title")}
        actions={
          <>
            <Link
              href="/dashboard/donations/import"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium hover:bg-muted"
            >
              <Upload className="size-4" />
              {t("importButton")}
            </Link>
            <ExportMenu exportUrl="/api/donations/export" filterParams={searchParams} selectedIds={selectedIds} moduleLabel="donations" />
            <Button
              variant="destructive"
              className="gap-1.5"
              onClick={() => setDeleteAllOpen(true)}
              aria-label={t("deleteAll.buttonLabel")}
            >
              <Trash2 className="size-4" />
              <span className="hidden sm:inline">{t("deleteAll.buttonLabel")}</span>
            </Button>
          </>
        }
      />

      <ResponsiveSearchBar
        pathname={PATHNAME}
        placeholder={t("searchPlaceholder")}
        sticky={false}
        filtersSlot={
          <>
            <FilterBottomSheet
              title={tCommon("filters")}
              activeCount={activeFilterCount}
              resetLabel={tCommon("resetFilters")}
              applyLabel={tCommon("applyFilters")}
              applyDisabled={customRangeInvalid}
              onOpenChange={(open) => {
                if (open) setPendingFilters(filtersFromSearchParams(searchParams));
              }}
              onReset={() => {
                const reset: PendingFilters = { preset: "custom", dateFrom: "", dateTo: "", purpose: "all" };
                setPendingFilters(reset);
                applyFilters(reset);
              }}
              onApply={() => applyFilters(pendingFilters)}
            >
              {filterSheetContent}
            </FilterBottomSheet>
            <DonationFormDialog
              mode="create"
              devotees={devotees}
              trigger={
                <Button className="shrink-0 gap-1.5">
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">{t("addButton")}</span>
                </Button>
              }
              onSaved={refresh}
            />
          </>
        }
      />
      </StickyToolbar>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label={t("summary.totalThisMonth")}
          value={Number(summary.totalThisMonth)}
          format="currency"
          icon={<HandCoins className="size-4.5" />}
          gradient="gradient-saffron-gold"
          compact
        />
        <MetricCard
          label={t("summary.totalAllTime")}
          value={Number(summary.totalAllTime)}
          format="currency"
          icon={<CalendarRange className="size-4.5" />}
          gradient="gradient-green-emerald"
          compact
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <BulkActionToolbar
        count={selectedIds.length}
        selectedLabel={t("bulkDelete.selectedCount", { count: selectedIds.length })}
        deleteLabel={tCommon("delete")}
        onDelete={() => setBulkDeleteOpen(true)}
      />

      {donations.length === 0 ? (
        <EmptyState
          icon={<HandCoins className="size-6" />}
          title={t("emptyState.title")}
          description={t("emptyState.description")}
          action={
            <DonationFormDialog
              mode="create"
              devotees={devotees}
              trigger={
                <Button className="gap-1.5">
                  <Plus className="size-4" />
                  {t("addButton")}
                </Button>
              }
              onSaved={refresh}
            />
          }
        />
      ) : (
        <>
          {/* Tablet + desktop: table, Method hidden on tablet (shown desktop-only). */}
          <div className="hidden md:block">
            <TableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.length > 0 && selectedIds.length === donations.length}
                        indeterminate={selectedIds.length > 0 && selectedIds.length < donations.length}
                        onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                        aria-label={t("selectAll")}
                      />
                    </TableHead>
                    <SortableTableHead column="donor" label={t("columns.donor")} currentSort={sort} currentDir={dir} pathname={PATHNAME} />
                    <SortableTableHead column="amount" label={t("columns.amount")} currentSort={sort} currentDir={dir} pathname={PATHNAME} />
                    <TableHead>{t("columns.purpose")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("columns.method")}</TableHead>
                    <SortableTableHead column="date" label={t("columns.date")} currentSort={sort} currentDir={dir} pathname={PATHNAME} />
                    <TableHead className="text-right">{t("columns.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <motion.tbody initial="hidden" animate="show" variants={staggerContainer()}>
                  {donations.map((donation) => (
                    <MotionTableRow key={donation.id} variants={rowFadeIn}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(donation.id)}
                          onCheckedChange={(checked) => toggleSelected(donation.id, checked === true)}
                          aria-label={t("selectRow", { name: donation.donorName })}
                        />
                      </TableCell>
                      <TableCell>
                        {donation.devoteeId ? (
                          <Link href={`/dashboard/devotees/${donation.devoteeId}`} className="font-medium hover:underline">
                            {donorDisplayName(donation)}
                          </Link>
                        ) : (
                          <span className="font-medium">{donorDisplayName(donation)}</span>
                        )}
                        {donation.donorPhone && !donation.isAnonymous && (
                          <p className="text-xs text-muted-foreground">{donation.donorPhone}</p>
                        )}
                        {!donation.devoteeId && (
                          <Badge variant="outline" className="mt-0.5 text-[0.65rem]">
                            {t("manualDonorBadge")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">{formatDonationAmount(donation.amount)}</TableCell>
                      <TableCell>{donation.purpose}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant={donation.itemDescription ? "outline" : "secondary"} className={donation.itemDescription ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-400" : undefined}>{paymentMethodLabel(donation.paymentMethod, donation.itemDescription)}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(donation.donatedAt, locale)}</TableCell>
                      <TableCell className="text-right">
                        <OverflowActionMenu items={donationActionItems(donation)} />
                      </TableCell>
                    </MotionTableRow>
                  ))}
                </motion.tbody>
              </Table>
              <PaginationControls page={page} pageSize={pageSize} totalCount={totalCount} pathname={PATHNAME} />
            </TableShell>
          </div>

          {/* Mobile: compact 3-column table (Donor / Amount / Purpose). Tap a row to open its actions. */}
          <div className="space-y-3 md:hidden">
            <TableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.length > 0 && selectedIds.length === donations.length}
                        indeterminate={selectedIds.length > 0 && selectedIds.length < donations.length}
                        onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                        aria-label={t("selectAll")}
                        className="size-5"
                      />
                    </TableHead>
                    <TableHead>{t("columns.donor")}</TableHead>
                    <TableHead>{t("columns.amount")}</TableHead>
                    <TableHead>{t("columns.purpose")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donations.map((donation) => (
                    <OverflowActionMenu
                      key={donation.id}
                      items={donationActionItems(donation)}
                      stopPropagation={false}
                      trigger={
                        <TableRow className="h-14 cursor-pointer">
                          <TableCell
                            className="py-3"
                            onClick={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedIds.includes(donation.id)}
                              onCheckedChange={(checked) => toggleSelected(donation.id, checked === true)}
                              aria-label={t("selectRow", { name: donation.donorName })}
                              className="size-5"
                            />
                          </TableCell>
                          <TableCell className="max-w-32 truncate py-3" title={donorDisplayName(donation)}>
                            {donorDisplayName(donation)}
                          </TableCell>
                          <TableCell className="py-3 text-base font-bold tabular-nums">{formatDonationAmount(donation.amount)}</TableCell>
                          <TableCell className="py-3">
                            <Badge variant="secondary" className="max-w-28 truncate">
                              {donation.purpose}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            </TableShell>
            <PaginationControls page={page} pageSize={pageSize} totalCount={totalCount} pathname={PATHNAME} />
          </div>
        </>
      )}

      {editingDonation && (
        <DonationFormDialog
          mode="edit"
          donation={editingDonation}
          devotees={devotees}
          trigger={<span className="hidden" />}
          open
          onOpenChange={(open) => {
            if (!open) setEditingDonation(null);
          }}
          onSaved={() => {
            setEditingDonation(null);
            refresh();
          }}
        />
      )}

      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          setBulkDeleteOpen(open);
          if (!open) setBulkDeleteError(null);
        }}
        title={t("bulkDelete.dialogTitle")}
        description={tCommon("bulkDeleteConfirm")}
        cancelLabel={tCommon("cancel")}
        confirmLabel={tCommon("delete")}
        onConfirm={handleBulkDelete}
        pending={bulkDeleting}
        error={bulkDeleteError}
      />

      <BulkDeleteDialog
        open={deleteAllOpen}
        onOpenChange={(open) => {
          setDeleteAllOpen(open);
          if (!open) setDeleteAllError(null);
        }}
        title={t("deleteAll.dialogTitle")}
        description={t("deleteAll.dialogDescription")}
        cancelLabel={tCommon("cancel")}
        confirmLabel={t("deleteAll.buttonLabel")}
        onConfirm={handleDeleteAll}
        pending={deleteAllPending}
        error={deleteAllError}
      />
    </div>
  );
}
