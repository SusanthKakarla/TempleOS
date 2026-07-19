"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { HandCoins, Plus } from "lucide-react";
import type { Devotee, DonationWithDonor, SupportedLanguage } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInr } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { ExportMenu } from "@/features/export/export-menu";
import { PAYMENT_METHOD_OPTIONS } from "./donation-options";
import { DonationFormDialog } from "./donation-form-dialog";
import { DonationsSearchInput } from "./donations-search-input";

export function DonationsTable({
  donations,
  devotees,
}: {
  donations: DonationWithDonor[];
  devotees: Devotee[];
}) {
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
      const params = new URLSearchParams(searchParams);
      if (dateFrom) params.set("dateFrom", dateFrom);
      else params.delete("dateFrom");
      if (dateTo) params.set("dateTo", dateTo);
      else params.delete("dateTo");
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{t("pageHeader.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("pageHeader.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <DonationsSearchInput />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-40"
          aria-label={t("dateFromLabel")}
        />
        <span className="text-sm text-muted-foreground">{t("dateRangeSeparator")}</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-40"
          aria-label={t("dateToLabel")}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {donations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-background py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <HandCoins className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">{t("emptyState.title")}</p>
          <p className="text-sm text-muted-foreground">{t("emptyState.description")}</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-background">
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
                <TableHead>{t("columns.donor")}</TableHead>
                <TableHead>{t("columns.amount")}</TableHead>
                <TableHead>{t("columns.purpose")}</TableHead>
                <TableHead>{t("columns.method")}</TableHead>
                <TableHead>{t("columns.date")}</TableHead>
                <TableHead className="text-right">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((donation) => (
                <TableRow key={donation.id}>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
