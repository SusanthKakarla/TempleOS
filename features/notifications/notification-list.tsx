"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BellRing, CheckCircle2, Clock, RefreshCw, XCircle } from "lucide-react";
import type { EventNotificationDeliveryStatus } from "@/types/db";
import type { EventNotificationListItem } from "@/lib/db/event-notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
  new_event: "New event",
  event_updated: "Event updated",
  event_cancelled: "Event cancelled",
};

export function NotificationList({
  notifications,
  eventId,
}: {
  notifications: EventNotificationListItem[];
  eventId?: string;
}) {
  const router = useRouter();
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
        throw new Error(body.error ?? "Failed to resend notifications");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend notifications");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold">
          {eventId ? "Notifications for this event" : "Recent notifications"}
        </h2>
        <div className="flex items-center gap-2">
          {eventId && (
            <Link href="/dashboard/notifications" className="text-sm text-muted-foreground underline-offset-2 hover:underline">
              Clear filter
            </Link>
          )}
          {eventId && failedCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleResendFailed} disabled={resending} className="gap-1.5">
              <RefreshCw className={resending ? "size-3.5 animate-spin" : "size-3.5"} />
              Resend {failedCount} failed
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-background py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <BellRing className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No notifications yet</p>
          <p className="text-sm text-muted-foreground">
            Publishing, updating, or cancelling an event will queue notifications here automatically.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Devotee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.eventTitle}</TableCell>
                  <TableCell>{n.devoteeName}</TableCell>
                  <TableCell>{NOTIFICATION_TYPE_LABEL[n.notificationType] ?? n.notificationType}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={STATUS_BADGE_VARIANT[n.deliveryStatus]} className="w-fit gap-1">
                        <StatusIcon status={n.deliveryStatus} />
                        {n.deliveryStatus}
                      </Badge>
                      {n.failureReason && <span className="text-xs text-destructive">{n.failureReason}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatTimestamp(n.sentAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
