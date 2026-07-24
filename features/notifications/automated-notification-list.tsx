import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, Clock, MessageCircle, Smartphone, XCircle } from "lucide-react";
import type { NotificationCategory, NotificationDeliveryStatus, SupportedLanguage } from "@/types/db";
import type { NotificationListItem, WhatsAppDeliveryAnalytics } from "@/lib/db/notifications";
import { Badge } from "@/components/ui/badge";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableShell } from "@/components/table-shell";
import { EmptyState } from "@/components/empty-state";
import { PaginationControls } from "@/components/pagination-controls";
import { MobileListView } from "@/components/mobile-list-view";
import { MobileListRow } from "@/components/mobile-list-row";
import { MetricCard } from "@/features/dashboard/metric-card";
import { NotificationDetailDrawer } from "./notification-detail-drawer";
import { formatDateTime } from "@/lib/date";

const STRATEGY_LABEL: Record<string, string> = { free_form: "Free-form", template: "Template" };

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

const CATEGORY_VALUES: NotificationCategory[] = [
  "birthday",
  "anniversary",
  "new_user",
  "devotee",
  "family",
  "event",
  "announcement",
  "platform",
];

interface AutomatedNotificationListProps {
  notifications: NotificationListItem[];
  category?: NotificationCategory;
  page: number;
  pageSize: number;
  totalCount: number;
  locale: SupportedLanguage;
  pathname?: string;
  /** Optional — omitted when the "notifications" tenant feature is disabled (the caller never computes it in that case). */
  analytics?: WhatsAppDeliveryAnalytics;
}

function formatRate(rate: number | null): string {
  return rate === null ? "—" : `${rate}%`;
}

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.round(seconds / 60)}m`;
}

function RateTile({ label, rate }: { label: string; rate: number | null }) {
  return (
    <div className="glass-card rounded-2xl p-3">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">{formatRate(rate)}</p>
    </div>
  );
}

function AnalyticsBlock({ analytics }: { analytics: WhatsAppDeliveryAnalytics }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Template Deliveries" value={analytics.templateDeliveries} icon={<CheckCircle2 className="size-4.5" />} gradient="gradient-blue-purple" compact />
        <MetricCard label="Free-form Deliveries" value={analytics.freeFormDeliveries} icon={<MessageCircle className="size-4.5" />} gradient="gradient-green-emerald" compact />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <RateTile label="Delivery Success" rate={analytics.deliverySuccessRate} />
        <RateTile label="Template Success" rate={analytics.templateSuccessRate} />
        <RateTile label="Conversation Window Open" rate={analytics.conversationWindowOpenRate} />
        <RateTile label="Retry Rate" rate={analytics.retryRate} />
        <RateTile label="Permanent Failures" rate={analytics.permanentFailureRate} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border p-3">
          <p className="mb-2 text-sm font-medium">Average Delivery Time</p>
          <p className="font-heading text-2xl font-semibold">{formatSeconds(analytics.averageDeliverySeconds)}</p>
        </div>
        <div className="rounded-2xl border p-3">
          <p className="mb-2 text-sm font-medium">Most Used Templates</p>
          {analytics.mostUsedTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground">None sent yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {analytics.mostUsedTemplates.map((row) => (
                <li key={row.templateUsed} className="flex items-center justify-between gap-2">
                  <span className="truncate">{row.templateUsed}</span>
                  <span className="text-muted-foreground">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {analytics.topFailedTemplates.length > 0 && (
          <div className="rounded-2xl border p-3 sm:col-span-2">
            <p className="mb-2 text-sm font-medium">Top Failed Templates</p>
            <ul className="space-y-1 text-sm">
              {analytics.topFailedTemplates.map((row) => (
                <li key={row.templateUsed} className="flex items-center justify-between gap-2">
                  <span className="truncate">{row.templateUsed}</span>
                  <span className="text-destructive">{row.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Delivery Success, Retry Rate, and Permanent Failures show &quot;—&quot; instead of 0% until at least one
        WhatsApp notification has been attempted, so an empty history never gets misread as 0% success.
      </p>
    </div>
  );
}

export async function AutomatedNotificationList({
  notifications,
  category,
  page,
  pageSize,
  totalCount,
  locale,
  pathname = "/dashboard/notifications",
  analytics,
}: AutomatedNotificationListProps) {
  const t = await getTranslations("notifications.automated");
  const tStatus = await getTranslations("notifications.list.statusLabels");

  function typeLabel(notificationType: string): string {
    return t.has(`typeLabels.${notificationType}`) ? t(`typeLabels.${notificationType}`) : notificationType;
  }

  return (
    <div className="space-y-3">
      {analytics && <AnalyticsBlock analytics={analytics} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold">{t("sectionTitle")}</h2>
        <div className="flex flex-wrap gap-1.5">
          <CategoryTab href={pathname} active={!category} label={t("categories.all")} />
          {CATEGORY_VALUES.map((value) => (
            <CategoryTab
              key={value}
              href={`${pathname}?category=${value}`}
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
        <>
          <div className="hidden md:block">
            <TableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columns.recipient")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("columns.type")}</TableHead>
                    <TableHead>{t("columns.channel")}</TableHead>
                    <TableHead className="hidden lg:table-cell">Strategy</TableHead>
                    <TableHead>{t("columns.status")}</TableHead>
                    <TableHead>{t("columns.sent")}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <tbody>
                  {notifications.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell className="align-top font-medium">{n.recipientName}</TableCell>
                      <TableCell className="hidden align-top lg:table-cell">{typeLabel(n.notificationType)}</TableCell>
                      <TableCell className="align-top">
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          {n.channel === "whatsapp" ? (
                            <MessageCircle className="size-3.5 text-muted-foreground" />
                          ) : (
                            <Smartphone className="size-3.5 text-muted-foreground" />
                          )}
                          {t(`channelLabels.${n.channel}`)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden align-top lg:table-cell">
                        {n.deliveryStrategy ? (
                          <Badge variant="outline">{STRATEGY_LABEL[n.deliveryStrategy] ?? n.deliveryStrategy}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-col gap-1">
                          <Badge variant={STATUS_BADGE_VARIANT[n.deliveryStatus]} className="w-fit gap-1">
                            <StatusIcon status={n.deliveryStatus} />
                            {tStatus(n.deliveryStatus)}
                          </Badge>
                          {n.failureReason && <span className="text-xs text-destructive">{n.failureReason}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-sm text-muted-foreground">
                        {n.sentAt ? formatDateTime(n.sentAt, locale) : "—"}
                      </TableCell>
                      <TableCell className="align-top">
                        <NotificationDetailDrawer notification={n} locale={locale} />
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
              <PaginationControls
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                pathname={pathname}
                paramName="notifPage"
              />
            </TableShell>
          </div>

          <div className="space-y-3 md:hidden">
            <MobileListView>
              {notifications.map((n) => (
                <MobileListRow
                  key={n.id}
                  title={n.recipientName}
                  subtitle={`${typeLabel(n.notificationType)} · ${t(`channelLabels.${n.channel}`)}`}
                  badge={
                    <Badge variant={STATUS_BADGE_VARIANT[n.deliveryStatus]} className="gap-1">
                      <StatusIcon status={n.deliveryStatus} />
                      {tStatus(n.deliveryStatus)}
                    </Badge>
                  }
                  trailing={
                    <div className="flex items-center gap-1">
                      <span className="text-xs whitespace-nowrap text-muted-foreground">
                        {n.sentAt ? formatDateTime(n.sentAt, locale) : "—"}
                      </span>
                      <NotificationDetailDrawer notification={n} locale={locale} />
                    </div>
                  }
                />
              ))}
            </MobileListView>
            <PaginationControls
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              pathname={pathname}
              paramName="notifPage"
            />
          </div>
        </>
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
