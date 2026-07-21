import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, Clock, MessageCircle, Smartphone, XCircle } from "lucide-react";
import type { NotificationCategory, NotificationDeliveryStatus, SupportedLanguage } from "@/types/db";
import type { NotificationListItem } from "@/lib/db/notifications";
import { Badge } from "@/components/ui/badge";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableShell } from "@/components/table-shell";
import { EmptyState } from "@/components/empty-state";
import { PaginationControls } from "@/components/pagination-controls";
import { formatDateTime } from "@/lib/date";

const STATUS_BADGE_VARIANT: Record<NotificationDeliveryStatus, "default" | "secondary" | "destructive"> = {
  sent: "default",
  delivered: "default",
  failed: "destructive",
  pending: "secondary",
  queued: "secondary",
  retrying: "secondary",
};

function StatusIcon({ status }: { status: NotificationDeliveryStatus }) {
  if (status === "failed") return <XCircle className="size-3.5 text-destructive" />;
  if (status === "sent" || status === "delivered") return <CheckCircle2 className="size-3.5 text-emerald" />;
  return <Clock className="size-3.5 text-muted-foreground" />;
}

const CATEGORY_VALUES: NotificationCategory[] = ["birthday", "new_user", "devotee", "event", "announcement"];

interface AutomatedNotificationListProps {
  notifications: NotificationListItem[];
  category?: NotificationCategory;
  page: number;
  pageSize: number;
  totalCount: number;
  locale: SupportedLanguage;
}

export async function AutomatedNotificationList({
  notifications,
  category,
  page,
  pageSize,
  totalCount,
  locale,
}: AutomatedNotificationListProps) {
  const t = await getTranslations("notifications.automated");
  const tStatus = await getTranslations("notifications.list.statusLabels");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold">{t("sectionTitle")}</h2>
        <div className="flex flex-wrap gap-1.5">
          <CategoryTab href="/dashboard/notifications" active={!category} label={t("categories.all")} />
          {CATEGORY_VALUES.map((value) => (
            <CategoryTab
              key={value}
              href={`/dashboard/notifications?category=${value}`}
              active={category === value}
              label={t(`categories.${value}`)}
            />
          ))}
        </div>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="size-6" />}
          title={t("emptyState.title")}
          description={t("emptyState.description")}
        />
      ) : (
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.recipient")}</TableHead>
                <TableHead>{t("columns.type")}</TableHead>
                <TableHead>{t("columns.channel")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.sent")}</TableHead>
              </TableRow>
            </TableHeader>
            <tbody>
              {notifications.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.recipientName}</TableCell>
                  <TableCell>{t(`typeLabels.${n.notificationType}`)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      {n.channel === "whatsapp" ? (
                        <MessageCircle className="size-3.5 text-muted-foreground" />
                      ) : (
                        <Smartphone className="size-3.5 text-muted-foreground" />
                      )}
                      {t(`channelLabels.${n.channel}`)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={STATUS_BADGE_VARIANT[n.deliveryStatus]} className="w-fit gap-1">
                        <StatusIcon status={n.deliveryStatus} />
                        {tStatus(n.deliveryStatus)}
                      </Badge>
                      {n.failureReason && <span className="text-xs text-destructive">{n.failureReason}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {n.sentAt ? formatDateTime(n.sentAt, locale) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
          <PaginationControls
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            pathname="/dashboard/notifications"
            paramName="notifPage"
          />
        </TableShell>
      )}
    </div>
  );
}

function CategoryTab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
          : "rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
      }
    >
      {label}
    </Link>
  );
}
