"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { NotificationListItem } from "@/lib/db/notifications";
import type { SupportedLanguage } from "@/types/db";
import { formatDateTime } from "@/lib/date";

const STRATEGY_LABEL: Record<string, string> = { free_form: "Free-form", template: "Template" };
const CONVERSATION_LABEL: Record<string, string> = { active: "Active (window open)", inactive: "Inactive (window closed)", unknown: "Unknown" };

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
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="View details">
            <Info className="size-4" />
          </Button>
        }
      />
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notification Details</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          <Row label="Notification ID">
            <code className="text-xs">{notification.id}</code>
          </Row>
          <Row label="Recipient">{notification.recipientName}</Row>
          <Row label="Type">{notification.notificationType}</Row>
          <Row label="Channel">{notification.channel}</Row>
          <Row label="Category">{notification.category}</Row>
          <Row label="Delivery Strategy">
            {notification.deliveryStrategy ? (
              <Badge variant="outline">{STRATEGY_LABEL[notification.deliveryStrategy] ?? notification.deliveryStrategy}</Badge>
            ) : (
              "—"
            )}
          </Row>
          {notification.templateUsed && <Row label="Template Used">{notification.templateUsed}</Row>}
          <Row label="Conversation Status">
            {notification.conversationStatus ? CONVERSATION_LABEL[notification.conversationStatus] ?? notification.conversationStatus : "—"}
          </Row>
          <Row label="Status">
            <Badge variant={notification.deliveryStatus === "failed" ? "destructive" : "outline"}>
              {notification.deliveryStatus}
            </Badge>
          </Row>
          <Row label="Retry Count">{notification.attemptCount}</Row>
          {notification.metaErrorCode !== null && <Row label="Meta Error Code">{notification.metaErrorCode}</Row>}
          {notification.metaErrorCategory && <Row label="Meta Error Category">{notification.metaErrorCategory}</Row>}
          {notification.failureReason && (
            <div className="border-b py-2 text-sm last:border-0">
              <p className="mb-1 text-muted-foreground">Failure Reason</p>
              <p className="font-medium">{notification.failureReason}</p>
            </div>
          )}
          <Row label="Created">{formatDateTime(notification.createdAt, locale)}</Row>
          {notification.sentAt && <Row label="Sent">{formatDateTime(notification.sentAt, locale)}</Row>}
          {notification.deliveredAt && <Row label="Delivered">{formatDateTime(notification.deliveredAt, locale)}</Row>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
