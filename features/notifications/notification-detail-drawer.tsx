"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { NotificationListItem } from "@/lib/db/notifications";
import type { SupportedLanguage } from "@/types/db";
import { formatDateTime } from "@/lib/date";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

/**
 * Full-lifecycle trace for a single notification — recipient, tenant,
 * delivery strategy, conversation status, template used, structured Meta
 * error, retry count, and timestamps. Reads directly from the already-loaded
 * NotificationListItem (no extra fetch — every field it needs is already in
 * the list query), so this is a plain client component, not a
 * fetch-on-open panel like UserActivityPanel.
 */
export function NotificationDetailDrawer({
  notification,
  locale,
}: {
  notification: NotificationListItem;
  locale: SupportedLanguage;
}) {
  const t = useTranslations("notifications.detailDrawer");
  const tStrategy = useTranslations("notifications.detailDrawer.strategyLabels");
  const tConversation = useTranslations("notifications.detailDrawer.conversationLabels");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="max-md:size-11" aria-label={t("viewDetails")}>
            <Info className="size-4" />
          </Button>
        }
      />
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          <Row label={t("notificationId")}>
            <code className="text-xs">{notification.id}</code>
          </Row>
          <Row label={t("recipient")}>{notification.recipientName}</Row>
          <Row label={t("type")}>{notification.notificationType}</Row>
          <Row label={t("channel")}>{notification.channel}</Row>
          <Row label={t("category")}>{notification.category}</Row>
          <Row label={t("deliveryStrategy")}>
            {notification.deliveryStrategy ? (
              <Badge variant="outline">{tStrategy(notification.deliveryStrategy)}</Badge>
            ) : (
              "—"
            )}
          </Row>
          {notification.templateUsed && <Row label={t("templateUsed")}>{notification.templateUsed}</Row>}
          <Row label={t("conversationStatus")}>
            {notification.conversationStatus ? tConversation(notification.conversationStatus) : "—"}
          </Row>
          <Row label={t("status")}>
            <Badge variant={notification.deliveryStatus === "failed" ? "destructive" : "outline"}>
              {notification.deliveryStatus}
            </Badge>
          </Row>
          <Row label={t("retryCount")}>{notification.attemptCount}</Row>
          {notification.metaErrorCode !== null && <Row label={t("metaErrorCode")}>{notification.metaErrorCode}</Row>}
          {notification.metaErrorCategory && <Row label={t("metaErrorCategory")}>{notification.metaErrorCategory}</Row>}
          {notification.failureReason && (
            <div className="border-b py-2 text-sm last:border-0">
              <p className="mb-1 text-muted-foreground">{t("failureReason")}</p>
              <p className="font-medium">{notification.failureReason}</p>
            </div>
          )}
          <Row label={t("created")}>{formatDateTime(notification.createdAt, locale)}</Row>
          {notification.sentAt && <Row label={t("sent")}>{formatDateTime(notification.sentAt, locale)}</Row>}
          {notification.deliveredAt && <Row label={t("delivered")}>{formatDateTime(notification.deliveredAt, locale)}</Row>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
