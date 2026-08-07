"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Archive, ArrowLeft, CalendarClock, Eye, HandCoins, Pause, Play, Send, XCircle } from "lucide-react";
import type { Campaign, SupportedLanguage } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { formatDate, formatDateTime } from "@/lib/date";
import { formatDonationAmount, formatInr } from "@/lib/currency";
import { computeRaisedPercentage } from "@/lib/campaigns/donation-message";
import { CampaignFormDialog } from "./campaign-form-dialog";
import { CampaignActions } from "./campaign-actions";

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

interface CampaignAnalytics {
  delivery: { recipients: number; queued: number; sent: number; delivered: number; failed: number; retrying: number };
  donation: { totalAmount: number; donationCount: number; donorCount: number } | null;
  donations: { id: string; donorName: string; amount: string | null; paymentMethod: string | null; itemDescription: string | null; donatedAt: string }[];
}

const STATUS_BADGE_VARIANT: Record<Campaign["status"], "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  scheduled: "outline",
  running: "default",
  paused: "outline",
  completed: "default",
  archived: "secondary",
  cancelled: "destructive",
};

export function CampaignDetail({ campaign, donationLink }: { campaign: Campaign; donationLink: string | null }) {
  const router = useRouter();
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("campaigns");
  const tDetail = useTranslations("campaigns.detail");
  const tStatus = useTranslations("campaigns.status");
  const tTypes = useTranslations("campaigns.types");
  const tCommon = useTranslations("common");
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ ready: boolean; reason?: string; previews?: Record<string, string> } | null>(
    null,
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    fetch(`/api/campaigns/${campaign.id}/analytics`)
      .then((res) => res.json())
      .then(setAnalytics)
      .catch(() => setAnalytics(null));
  }, [campaign.id]);

  function refresh() {
    router.refresh();
  }

  async function handleSendNow() {
    if (!window.confirm(t("confirm.sendNow"))) return;
    setError(null);
    setPending(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/send`, { method: "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("sendError"));
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sendError"));
    } finally {
      setPending(false);
    }
  }

  async function handleStatusAction(action: "pause" | "resume" | "cancel" | "archive") {
    if (action === "cancel" && !window.confirm(t("confirm.cancel"))) return;
    setError(null);
    setPending(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("statusChangeError"));
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("statusChangeError"));
    } finally {
      setPending(false);
    }
  }

  /** Opens the picker only — never touches the network or mutates the campaign, so simply opening the scheduler can't have any side effect. */
  function handleSchedule() {
    setScheduleDate("");
    setScheduleTime("");
    setScheduleOpen(true);
  }

  async function handleConfirmSchedule() {
    if (!scheduleDate || !scheduleTime) {
      toast.error(tDetail("scheduleModal.pastError"));
      return;
    }
    const timestamp = new Date(`${scheduleDate}T${scheduleTime}`);
    if (Number.isNaN(timestamp.getTime()) || timestamp.getTime() <= Date.now()) {
      toast.error(tDetail("scheduleModal.pastError"));
      return;
    }
    setScheduling(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: timestamp.toISOString() }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        const message =
          response.status === 404 ? tDetail("scheduleModal.notFoundError") : (body.error ?? tDetail("scheduleModal.failedError"));
        toast.error(message);
        return;
      }
      toast.success(tDetail("scheduleModal.successToast"));
      setScheduleOpen(false);
      refresh();
    } catch {
      toast.error(tDetail("scheduleModal.failedError"));
    } finally {
      setScheduling(false);
    }
  }

  async function handlePreview() {
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/preview`);
      const body = await response.json().catch(() => null);
      setPreviewData(body);
    } finally {
      setPreviewLoading(false);
    }
  }

  const delivery = analytics?.delivery;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-col gap-1">
            <Link href="/dashboard/campaigns" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline">
              <ArrowLeft className="size-3.5" />
              {tDetail("backLink")}
            </Link>
            {campaign.title}
          </span>
        }
        subtitle={
          <span className="flex items-center gap-2">
            {tTypes(campaign.campaignType)}
            <Badge variant={STATUS_BADGE_VARIANT[campaign.status]}>{tStatus(campaign.status)}</Badge>
          </span>
        }
        actions={
          <>
            {campaign.status === "draft" && (
              <CampaignFormDialog
                mode="edit"
                campaign={campaign}
                donationLink={donationLink}
                trigger={<Button variant="outline">{tCommon("edit")}</Button>}
                onSaved={refresh}
              />
            )}
            {campaign.linkedDonationPurpose && (
              <Button variant="outline" className="gap-1.5" onClick={handlePreview}>
                <Eye className="size-4" />
                {t("actionItems.preview")}
              </Button>
            )}
            {(campaign.status === "draft" || campaign.status === "paused") && (
              <Button variant="outline" className="gap-1.5" disabled={pending} onClick={handleSchedule}>
                <CalendarClock className="size-4" />
                {t("actionItems.schedule")}
              </Button>
            )}
            {(campaign.status === "draft" || campaign.status === "scheduled" || campaign.status === "paused") && (
              <Button className="gap-1.5" disabled={pending} onClick={handleSendNow}>
                <Send className="size-4" />
                {t("actionItems.sendNow")}
              </Button>
            )}
            {(campaign.status === "running" || campaign.status === "scheduled") && (
              <Button variant="outline" className="gap-1.5" disabled={pending} onClick={() => handleStatusAction("pause")}>
                <Pause className="size-4" />
                {t("actionItems.pause")}
              </Button>
            )}
            {campaign.status === "paused" && (
              <Button variant="outline" className="gap-1.5" disabled={pending} onClick={() => handleStatusAction("resume")}>
                <Play className="size-4" />
                {t("actionItems.resume")}
              </Button>
            )}
            {["draft", "scheduled", "running", "paused"].includes(campaign.status) && (
              <Button variant="outline" className="gap-1.5" disabled={pending} onClick={() => handleStatusAction("cancel")}>
                <XCircle className="size-4" />
                {t("actionItems.cancel")}
              </Button>
            )}
            {(campaign.status === "completed" || campaign.status === "cancelled") && (
              <Button variant="outline" className="gap-1.5" disabled={pending} onClick={() => handleStatusAction("archive")}>
                <Archive className="size-4" />
                {t("actionItems.archive")}
              </Button>
            )}
          </>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {donationLink && <CampaignActions donationLink={donationLink} />}

      {campaign.lastRunAt ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label={tDetail("stats.recipients")} value={delivery?.recipients ?? 0} />
          <StatCard label={tDetail("stats.sent")} value={delivery?.sent ?? 0} />
          <StatCard label={tDetail("stats.delivered")} value={delivery?.delivered ?? 0} />
          <StatCard label={tDetail("stats.failed")} value={delivery?.failed ?? 0} />
        </div>
      ) : (
        <EmptyState icon={<Send className="size-6" />} title={tDetail("noMessagesSent")} />
      )}

      <Tabs defaultValue="overview" className="gap-4">
        <TabsList variant="line">
          <TabsTrigger value="overview">{tDetail("tabs.overview")}</TabsTrigger>
          {campaign.linkedDonationPurpose && <TabsTrigger value="donations">{tDetail("tabs.donations")}</TabsTrigger>}
          <TabsTrigger value="analytics">{tDetail("tabs.analytics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <p className="font-heading text-sm font-semibold">{tDetail("aboutTitle")}</p>
          <p className="text-sm text-muted-foreground">{campaign.description || tDetail("noDescription")}</p>
          {campaign.customMessage && (
            <div className="rounded-xl border bg-muted/40 p-4 text-sm whitespace-pre-wrap">{campaign.customMessage}</div>
          )}
        </TabsContent>

        {campaign.linkedDonationPurpose && (
          <TabsContent value="donations" className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatCard label={tDetail("stats.raised")} value={formatInr(Number(analytics?.donation?.totalAmount ?? 0))} />
              <StatCard label={tDetail("stats.donors")} value={analytics?.donation?.donorCount ?? 0} />
              <StatCard label={tDetail("tabs.donations")} value={analytics?.donation?.donationCount ?? 0} />
            </div>
            {campaign.goalAmount && (
              <div className="space-y-2 rounded-xl border bg-muted/40 p-3">
                {(() => {
                  const goal = Number(campaign.goalAmount);
                  const raised = Number(analytics?.donation?.totalAmount ?? 0);
                  const rawPercentage = computeRaisedPercentage(raised, goal);
                  const displayPercentage = Math.min(100, Math.round(rawPercentage));
                  return (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {tDetail("goalProgress", { raised: formatInr(raised), goal: formatInr(goal) })}
                        </span>
                        <span className="font-medium tabular-nums">
                          {rawPercentage >= 100 ? tDetail("goalReached") : `${displayPercentage}%`}
                        </span>
                      </div>
                      <Progress value={displayPercentage} />
                    </>
                  );
                })()}
              </div>
            )}
            {!analytics || analytics.donations.length === 0 ? (
              <EmptyState icon={<HandCoins className="size-6" />} title={tDetail("donationsEmpty")} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tDetail("donationColumns.donor")}</TableHead>
                    <TableHead>{tDetail("donationColumns.amount")}</TableHead>
                    <TableHead>{tDetail("donationColumns.date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.donations.map((donation) => (
                    <TableRow key={donation.id}>
                      <TableCell className="font-medium">{donation.donorName}</TableCell>
                      <TableCell className="tabular-nums">{donation.itemDescription ?? formatDonationAmount(donation.amount)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(donation.donatedAt, locale)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        )}

        <TabsContent value="analytics">
          {campaign.lastRunAt ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <StatCard label={tDetail("stats.recipients")} value={delivery?.recipients ?? 0} />
                <StatCard label={tDetail("stats.sent")} value={delivery?.sent ?? 0} />
                <StatCard label={tDetail("stats.delivered")} value={delivery?.delivered ?? 0} />
                <StatCard label={tDetail("stats.failed")} value={delivery?.failed ?? 0} />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{formatDate(campaign.lastRunAt, locale)}</p>
            </>
          ) : (
            <EmptyState icon={<Send className="size-6" />} title={tDetail("noMessagesSent")} />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{tDetail("previewTitle")}</DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
          ) : !previewData?.ready ? (
            <p className="text-sm text-muted-foreground">{previewData?.reason ?? tDetail("previewNotReady")}</p>
          ) : (
            <div className="space-y-4">
              {(["en", "te"] as const).map((language) => (
                <div key={language} className="space-y-1.5">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {language === "en" ? "English" : "తెలుగు"}
                  </p>
                  <div className="rounded-xl border bg-muted/40 p-4 text-sm whitespace-pre-wrap">
                    {previewData.previews?.[language] || tDetail("previewNotReady")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{tDetail("scheduleModal.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="schedule-date">{tDetail("scheduleModal.dateLabel")}</Label>
              <DatePicker id="schedule-date" size="lg" value={scheduleDate} onChange={setScheduleDate} minDate={startOfToday()} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-time">{tDetail("scheduleModal.timeLabel")}</Label>
              <Input
                id="schedule-time"
                type="time"
                value={scheduleTime}
                onChange={(event) => setScheduleTime(event.target.value)}
              />
            </div>
            {scheduleDate && scheduleTime && !Number.isNaN(new Date(`${scheduleDate}T${scheduleTime}`).getTime()) && (
              <p className="text-sm text-muted-foreground">
                {tDetail("scheduleModal.selectedPreview", {
                  value: formatDateTime(new Date(`${scheduleDate}T${scheduleTime}`).toISOString(), locale),
                })}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={scheduling}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleConfirmSchedule} disabled={scheduling || !scheduleDate || !scheduleTime}>
              {scheduling ? tDetail("scheduleModal.scheduling") : tDetail("scheduleModal.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-card space-y-1 rounded-2xl p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
