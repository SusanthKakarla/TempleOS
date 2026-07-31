"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { HandCoins, Pencil, Plus, Trash2 } from "lucide-react";
import type { Devotee, Donation, SupportedLanguage } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { TableShell } from "@/components/table-shell";
import { OverflowActionMenu } from "@/components/overflow-action-menu";
import { MobileListView } from "@/components/mobile-list-view";
import { MobileListRow } from "@/components/mobile-list-row";
import { formatDonationAmount, formatInr } from "@/lib/currency";
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
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);

  function paymentMethodLabel(value: string | null, itemDescription: string | null): string {
    if (itemDescription) return tDonations("nonCashBadge");
    if (!value) return "—";
    const option = PAYMENT_METHOD_OPTIONS.find((o) => o.value === value);
    return option ? tDonations(`paymentMethods.${option.value}`) : value;
  }

  function refresh() {
    router.refresh();
  }

  function donationActionItems(donation: Donation) {
    return [
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

  async function handleDelete(donation: Donation) {
    if (!window.confirm(t("confirmDelete", { amount: formatDonationAmount(donation.amount) }))) {
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
    <div className="glass-card flex flex-col gap-4 rounded-2xl p-5">
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
        <>
          <div className="hidden md:block">
            <TableShell>
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
                      <TableCell className="font-medium tabular-nums">{donation.itemDescription ?? formatDonationAmount(donation.amount)}</TableCell>
                      <TableCell>{donation.purpose}</TableCell>
                      <TableCell>
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
            </TableShell>
          </div>

          <div className="md:hidden">
            <MobileListView>
              {donations.map((donation) => (
                <MobileListRow
                  key={donation.id}
                  title={donation.itemDescription ?? formatDonationAmount(donation.amount)}
                  subtitle={`${donation.purpose} · ${formatDate(donation.donatedAt, locale)}`}
                  badge={
                    <Badge
                      variant={donation.itemDescription ? "outline" : "secondary"}
                      className={donation.itemDescription ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-400" : undefined}
                    >
                      {paymentMethodLabel(donation.paymentMethod, donation.itemDescription)}
                    </Badge>
                  }
                  trailing={<OverflowActionMenu items={donationActionItems(donation)} />}
                />
              ))}
            </MobileListView>
          </div>
        </>
      )}

      {editingDonation && (
        <DonationFormDialog
          mode="edit"
          donation={editingDonation}
          devotees={[devotee]}
          fixedDevoteeId={devotee.id}
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
