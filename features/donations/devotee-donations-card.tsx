"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { HandCoins, Plus } from "lucide-react";
import type { Devotee, Donation, SupportedLanguage } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { formatInr } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { rowFadeIn, staggerContainer } from "@/lib/motion";
import { PAYMENT_METHOD_OPTIONS } from "./donation-options";
import { DonationFormDialog } from "./donation-form-dialog";

const MotionTableRow = motion.create(TableRow);

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
    <Card className="glass-card gap-4 rounded-2xl p-5">
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
        <EmptyState icon={<HandCoins className="size-5" />} title={t("emptyState")} className="py-10" />
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
            <motion.tbody initial="hidden" animate="show" variants={staggerContainer()}>
              {donations.map((donation) => (
                <MotionTableRow key={donation.id} variants={rowFadeIn}>
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
                </MotionTableRow>
              ))}
            </motion.tbody>
          </Table>
        </div>
      )}
    </Card>
  );
}
