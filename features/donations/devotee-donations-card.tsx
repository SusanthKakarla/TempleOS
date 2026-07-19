"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { HandCoins, Plus } from "lucide-react";
import type { Devotee, Donation, SupportedLanguage } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { PAYMENT_METHOD_OPTIONS } from "./donation-options";
import { DonationFormDialog } from "./donation-form-dialog";

export function DevoteeDonationsCard({
  devotee,
  donations,
}: {
  devotee: Devotee;
  donations: Donation[];
}) {
  const router = useRouter();
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("devotees.donationsCard");
  const tCommon = useTranslations("common");
  const tDonations = useTranslations("donations");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function paymentMethodLabel(value: string): string {
    const option = PAYMENT_METHOD_OPTIONS.find((o) => o.value === value);
    return option ? tDonations(`paymentMethods.${option.value}`) : value;
  }

  function refresh() {
    router.refresh();
  }

  async function handleDelete(donation: Donation) {
    if (!window.confirm(t("confirmDelete", { amount: formatInr(donation.amount) }))) {
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
    <Card className="gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {devotee.isDonor
              ? t("summary", {
                  amount: formatInr(devotee.totalDonatedAmount),
                  date: formatDate(devotee.lastDonationAt!, locale),
                })
              : t("noDonations")}
          </p>
        </div>
        <DonationFormDialog
          mode="create"
          devotees={[devotee]}
          fixedDevoteeId={devotee.id}
          trigger={
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" />
              {t("addButton")}
            </Button>
          }
          onSaved={refresh}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {donations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <HandCoins className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
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
                      devotees={[devotee]}
                      fixedDevoteeId={devotee.id}
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
    </Card>
  );
}
