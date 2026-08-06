"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, Check, HandCoins, X } from "lucide-react";
import type { PendingUpiDonation } from "@/lib/db/payment-transactions";
import type { SupportedLanguage } from "@/types/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDonationAmount } from "@/lib/currency";
import { formatDateTime } from "@/lib/date";

interface PendingDonationsTableProps {
  donations: PendingUpiDonation[];
}

export function PendingDonationsTable({ donations }: PendingDonationsTableProps) {
  const router = useRouter();
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("donations.pending");
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleAction(id: string, action: "approve" | "reject") {
    const confirmMessage = action === "approve" ? t("approveConfirm") : t("rejectConfirm");
    if (!window.confirm(confirmMessage)) return;

    setPendingId(id);
    try {
      const response = await fetch(`/api/payments/pending-donations/${id}/${action}`, { method: "POST" });
      if (!response.ok) throw new Error(t("actionError"));
      toast.success(action === "approve" ? t("approveSuccess") : t("rejectSuccess"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("actionError"));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-col gap-1">
            <Link href="/dashboard/donations" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline">
              <ArrowLeft className="size-3.5" />
              {t("backLink")}
            </Link>
            {t("pageHeader.title")}
          </span>
        }
        subtitle={t("pageHeader.subtitle")}
      />

      {donations.length === 0 ? (
        <EmptyState icon={<HandCoins className="size-6" />} title={t("emptyState.title")} description={t("emptyState.description")} />
      ) : (
        <div className="glass-card overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.donor")}</TableHead>
                <TableHead>{t("columns.phone")}</TableHead>
                <TableHead>{t("columns.campaign")}</TableHead>
                <TableHead>{t("columns.amount")}</TableHead>
                <TableHead>{t("columns.reference")}</TableHead>
                <TableHead>{t("columns.screenshot")}</TableHead>
                <TableHead>{t("columns.submitted")}</TableHead>
                <TableHead className="text-right">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((donation) => (
                <TableRow key={donation.id}>
                  <TableCell className="font-medium">{donation.donorName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{donation.donorPhone ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{donation.campaignTitle ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{formatDonationAmount(donation.amount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{donation.upiReference ?? t("noReference")}</TableCell>
                  <TableCell>
                    {donation.paymentScreenshotUrl ? (
                      <a
                        href={donation.paymentScreenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {t("viewScreenshot")}
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">{t("noReference")}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(donation.createdAt, locale)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={pendingId === donation.id}
                        onClick={() => handleAction(donation.id, "reject")}
                      >
                        <X className="size-3.5" />
                        {t("rejectButton")}
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        disabled={pendingId === donation.id}
                        onClick={() => handleAction(donation.id, "approve")}
                      >
                        <Check className="size-3.5" />
                        {t("approveButton")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
