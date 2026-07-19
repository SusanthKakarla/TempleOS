"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { motion } from "framer-motion";
import { BellRing, CheckCircle2, Clock, RefreshCw, XCircle } from "lucide-react";
import type { EventNotificationDeliveryStatus, SupportedLanguage } from "@/types/db";
import type { EventNotificationListItem } from "@/lib/db/event-notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableShell } from "@/components/table-shell";
import { EmptyState } from "@/components/empty-state";
import { formatDateTime } from "@/lib/date";
import { rowFadeIn, staggerContainer } from "@/lib/motion";

const MotionTableRow = motion.create(TableRow);

const STATUS_BADGE_VARIANT: Record<EventNotificationDeliveryStatus, "default" | "secondary" | "destructive"> = {
  sent: "default",
  delivered: "default",
  failed: "destructive",
  pending: "secondary",
  queued: "secondary",
  retrying: "secondary",
};

function StatusIcon({ status }: { status: EventNotificationDeliveryStatus }) {
  if (status === "failed") return <XCircle className="size-3.5 text-destructive" />;
  if (status === "sent" || status === "delivered") return <CheckCircle2 className="size-3.5 text-emerald" />;
  return <Clock className="size-3.5 text-muted-foreground" />;
}

export function NotificationList({
  notifications,
  eventId,
}: {
  notifications: EventNotificationListItem[];
  eventId?: string;
}) {
  const router = useRouter();
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("notifications.list");
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const failedCount = notifications.filter((n) => n.deliveryStatus === "failed").length;

  async function handleResendFailed() {
    if (!eventId) return;
    setError(null);
    setResending(true);
    try {
      const response = await fetch(`/api/events/${eventId}/notifications/resend`, { method: "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("resendError"));
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("resendError"));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold">
          {eventId ? t("titleFiltered") : t("titleAll")}
        </h2>
        <div className="flex items-center gap-2">
          {eventId && (
            <Link href="/dashboard/notifications" className="text-sm text-muted-foreground underline-offset-2 hover:underline">
              {t("clearFilter")}
            </Link>
          )}
          {eventId && failedCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleResendFailed} disabled={resending} className="gap-1.5">
              <RefreshCw className={resending ? "size-3.5 animate-spin" : "size-3.5"} />
              {t("resendFailed", { count: failedCount })}
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {notifications.length === 0 ? (
        <EmptyState
          icon={<BellRing className="size-6" />}
          title={t("emptyState.title")}
          description={t("emptyState.description")}
        />
      ) : (
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.event")}</TableHead>
                <TableHead>{t("columns.devotee")}</TableHead>
                <TableHead>{t("columns.type")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.sent")}</TableHead>
              </TableRow>
            </TableHeader>
            <motion.tbody initial="hidden" animate="show" variants={staggerContainer()}>
              {notifications.map((n) => (
                <MotionTableRow key={n.id} variants={rowFadeIn}>
                  <TableCell className="font-medium">{n.eventTitle}</TableCell>
                  <TableCell>{n.devoteeName}</TableCell>
                  <TableCell>
                    {t.has(`typeLabels.${n.notificationType}`)
                      ? t(`typeLabels.${n.notificationType}`)
                      : n.notificationType}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={STATUS_BADGE_VARIANT[n.deliveryStatus]} className="w-fit gap-1">
                        <StatusIcon status={n.deliveryStatus} />
                        {t(`statusLabels.${n.deliveryStatus}`)}
                      </Badge>
                      {n.failureReason && <span className="text-xs text-destructive">{n.failureReason}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {n.sentAt ? formatDateTime(n.sentAt, locale) : "—"}
                  </TableCell>
                </MotionTableRow>
              ))}
            </motion.tbody>
          </Table>
        </TableShell>
      )}
    </div>
  );
}
