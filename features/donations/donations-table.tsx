"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarRange, Download, Eye, HandCoins, Pencil, Plus, Trash2 } from "lucide-react";
import type { Devotee, DonationSummary, DonationWithDonor, SupportedLanguage } from "@/types/db";
import { MetricCard } from "@/features/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import { SortableTableHead } from "@/components/sortable-table-head";
import { PaginationControls } from "@/components/pagination-controls";
import { PageHeader } from "@/components/page-header";
import { OverflowActionMenu } from "@/components/overflow-action-menu";
import { FilterBottomSheet } from "@/components/filter-bottom-sheet";
import { ResponsiveSearchBar } from "@/components/responsive-search-bar";
import { formatInr } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { rowFadeIn, staggerContainer } from "@/lib/motion";
import { mergeSearchParam } from "@/lib/url-params";
import { ExportMenu } from "@/features/export/export-menu";
import { DONATION_PURPOSE_PRESETS, PAYMENT_METHOD_OPTIONS } from "./donation-options";
import { DonationFormDialog } from "./donation-form-dialog";

const MotionTableRow = motion.create(TableRow);
const PATHNAME = "/dashboard/donations";

type DatePreset = "today" | "last7" | "last30" | "thisMonth" | "custom";

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function rangeForPreset(preset: DatePreset): { dateFrom: string; dateTo: string } | null {
  const today = new Date();
  const todayIso = toISODate(today);
  switch (preset) {
    case "today":
      return { dateFrom: todayIso, dateTo: todayIso };
    case "last7": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { dateFrom: toISODate(from), dateTo: todayIso };
    }
    case "last30": {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { dateFrom: toISODate(from), dateTo: todayIso };
    }
    case "thisMonth": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: toISODate(from), dateTo: todayIso };
    }
    case "custom":
      return null;
  }
}

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

function filtersFromSearchParams(searchParams: URLSearchParams): PendingFilters {
  return {
    preset: "custom",
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
    purpose: searchParams.get("purpose") ?? "all",
  };
}

export function DonationsTable({ donations, devotees, page, pageSize, totalCount, sort, dir, summary }: DonationsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("donations");
  const tCommon = useTranslations("common");
  const tExport = useTranslations("export");

  function paymentMethodLabel(value: string): string {
    const option = PAYMENT_METHOD_OPTIONS.find((o) => o.value === value);
    return option ? t(`paymentMethods.${option.value}`) : value;
  }

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<DonationWithDonor | null>(null);
  const [pendingFilters, setPendingFilters] = useState<PendingFilters>(() => filtersFromSearchParams(searchParams));

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
    if (!window.confirm(t("confirmDelete", { amount: formatInr(donation.amount), name: donation.donorName }))) {
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
  const presetItems: Record<DatePreset, string> = {
    today: t("filters.presetToday"),
    last7: t("filters.presetLast7"),
    last30: t("filters.presetLast30"),
    thisMonth: t("filters.presetThisMonth"),
    custom: t("filters.presetCustom"),
  };

  const activeFilterCount = [
    searchParams.get("dateFrom") || searchParams.get("dateTo") ? 1 : 0,
    searchParams.get("purpose") ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  function donationActionItems(donation: DonationWithDonor) {
    return [
      {
        label: tCommon("viewDetails"),
        icon: <Eye className="size-4" />,
        onClick: () => router.push(`/dashboard/devotees/${donation.devoteeId}`),
      },
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

  const filterSheetContent = (
    <div className="space-y-4 py-4">
      <div className="space-y-1.5">
        <Label>{t("filters.dateRangeLabel")}</Label>
        <Select
          value={pendingFilters.preset}
          onValueChange={(v) => setPendingFilters((f) => ({ ...f, preset: (v as DatePreset) ?? "custom" }))}
          items={presetItems}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(presetItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pendingFilters.preset === "custom" && (
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" className="w-full justify-start font-normal">
                  {pendingFilters.dateFrom && pendingFilters.dateTo
                    ? `${pendingFilters.dateFrom} → ${pendingFilters.dateTo}`
                    : t("filters.pickCustomRange")}
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{
                  from: pendingFilters.dateFrom ? new Date(pendingFilters.dateFrom) : undefined,
                  to: pendingFilters.dateTo ? new Date(pendingFilters.dateTo) : undefined,
                }}
                onSelect={(range) =>
                  setPendingFilters((f) => ({
                    ...f,
                    dateFrom: range?.from ? toISODate(range.from) : "",
                    dateTo: range?.to ? toISODate(range.to) : "",
                  }))
                }
                autoFocus
              />
            </PopoverContent>
          </Popover>
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
    <div className="space-y-4">
      <PageHeader
        title={t("pageHeader.title")}
        subtitle={t("pageHeader.subtitle")}
        actions={
          <>
            <div className="hidden lg:block">
              <ExportMenu exportUrl="/api/donations/export" filterParams={searchParams} selectedIds={selectedIds} moduleLabel="donations" />
            </div>
            <OverflowActionMenu
              label={tExport("exportButton")}
              items={[{ label: tExport("exportButton"), icon: <Download className="size-4" />, onClick: () => setExportOpen(true) }]}
            />
            <ExportMenu
              exportUrl="/api/donations/export"
              filterParams={searchParams}
              selectedIds={selectedIds}
              moduleLabel="donations"
              open={exportOpen}
              onOpenChange={setExportOpen}
              hideTrigger
            />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      {error && <p className="text-sm text-destructive">{error}</p>}

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
                        <Link href={`/dashboard/devotees/${donation.devoteeId}`} className="font-medium hover:underline">
                          {donation.donorName}
                        </Link>
                        <p className="text-xs text-muted-foreground">{donation.donorPhone}</p>
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">{formatInr(donation.amount)}</TableCell>
                      <TableCell>{donation.purpose}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="secondary">{paymentMethodLabel(donation.paymentMethod)}</Badge>
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
                          <TableCell className="max-w-32 truncate py-3" title={donation.donorName}>
                            {donation.donorName}
                          </TableCell>
                          <TableCell className="py-3 text-base font-bold tabular-nums">{formatInr(donation.amount)}</TableCell>
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

    </div>
  );
}
