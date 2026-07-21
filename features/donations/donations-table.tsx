"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { motion } from "framer-motion";
import { HandCoins, Plus } from "lucide-react";
import type { Devotee, DonationWithDonor, SupportedLanguage } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { formatInr } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { rowFadeIn, staggerContainer } from "@/lib/motion";
import { mergeSearchParam } from "@/lib/url-params";
import { ExportMenu } from "@/features/export/export-menu";
import { PAYMENT_METHOD_OPTIONS } from "./donation-options";
import { DonationFormDialog } from "./donation-form-dialog";
import { DonationsSearchInput } from "./donations-search-input";

const MotionTableRow = motion.create(TableRow);

interface DonationsTableProps {
  donations: DonationWithDonor[];
  devotees: Devotee[];
  page: number;
  pageSize: number;
  totalCount: number;
  sort?: "date" | "amount" | "donor";
  dir: "asc" | "desc";
}

export function DonationsTable({ donations, devotees, page, pageSize, totalCount, sort, dir }: DonationsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("donations");
  const tCommon = useTranslations("common");

  function paymentMethodLabel(value: string): string {
    const option = PAYMENT_METHOD_OPTIONS.find((o) => o.value === value);
    return option ? t(`paymentMethods.${option.value}`) : value;
  }

  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? donations.map((d) => d.id) : []);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      let params = mergeSearchParam(searchParams, "dateFrom", dateFrom || null);
      params = mergeSearchParam(params, "dateTo", dateTo || null);
      router.replace(`/dashboard/donations?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when the debounced date filters change
  }, [dateFrom, dateTo]);

  function refresh() {
    router.refresh();
  }

  async function handleDelete(donation: DonationWithDonor) {
    if (
      !window.confirm(
        t("confirmDelete", { amount: formatInr(donation.amount), name: donation.donorName }),
      )
    ) {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageHeader.title")}
        subtitle={t("pageHeader.subtitle")}
        actions={
          <>
            <ExportMenu
              exportUrl="/api/donations/export"
              filterParams={searchParams}
              selectedIds={selectedIds}
              moduleLabel="donations"
            />
            <DonationFormDialog
              mode="create"
              devotees={devotees}
              trigger={
                <Button className="hidden gap-1.5 sm:inline-flex">
                  <Plus className="size-4" />
                  {t("addButton")}
                </Button>
              }
              onSaved={refresh}
            />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <DonationsSearchInput />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full sm:w-40"
          aria-label={t("dateFromLabel")}
        />
        <span className="text-sm text-muted-foreground">{t("dateRangeSeparator")}</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full sm:w-40"
          aria-label={t("dateToLabel")}
        />
      </div>

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
                <SortableTableHead
                  column="donor"
                  label={t("columns.donor")}
                  currentSort={sort}
                  currentDir={dir}
                  pathname="/dashboard/donations"
                />
                <SortableTableHead
                  column="amount"
                  label={t("columns.amount")}
                  currentSort={sort}
                  currentDir={dir}
                  pathname="/dashboard/donations"
                />
                <TableHead>{t("columns.purpose")}</TableHead>
                <TableHead>{t("columns.method")}</TableHead>
                <SortableTableHead
                  column="date"
                  label={t("columns.date")}
                  currentSort={sort}
                  currentDir={dir}
                  pathname="/dashboard/donations"
                />
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
                    <Link
                      href={`/dashboard/devotees/${donation.devoteeId}`}
                      className="font-medium hover:underline"
                    >
                      {donation.donorName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{donation.donorPhone}</p>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">{formatInr(donation.amount)}</TableCell>
                  <TableCell>{donation.purpose}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{paymentMethodLabel(donation.paymentMethod)}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(donation.donatedAt, locale)}</TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <DonationFormDialog
                      mode="edit"
                      donation={donation}
                      devotees={devotees}
                      trigger={
                        <Button variant="outline" size="sm" disabled={pendingId === donation.id}>
                          {tCommon("edit")}
                        </Button>
                      }
                      onSaved={refresh}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pendingId === donation.id}
                      onClick={() => handleDelete(donation)}
                    >
                      {tCommon("delete")}
                    </Button>
                  </TableCell>
                </MotionTableRow>
              ))}
            </motion.tbody>
          </Table>
          <PaginationControls page={page} pageSize={pageSize} totalCount={totalCount} pathname="/dashboard/donations" />
        </TableShell>
      )}

      <DonationFormDialog
        mode="create"
        devotees={devotees}
        trigger={
          <Button size="icon-lg" className="fixed right-4 bottom-4 z-40 rounded-full shadow-lg sm:hidden">
            <Plus className="size-5" />
            <span className="sr-only">{t("addButton")}</span>
          </Button>
        }
        onSaved={refresh}
      />
    </div>
  );
}
