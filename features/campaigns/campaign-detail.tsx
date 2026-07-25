"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Archive, ArrowLeft, Copy, HandCoins, Pause, Play, Send, XCircle } from "lucide-react";
import type { Campaign, SupportedLanguage } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { formatDate, formatDateTime } from "@/lib/date";
import { formatInr } from "@/lib/currency";
import { CampaignFormDialog } from "./campaign-form-dialog";

interface CampaignAnalytics {
  delivery: { recipients: number; queued: number; sent: number; delivered: number; failed: number; retrying: number };
  donation: { totalAmount: number; donationCount: number; donorCount: number } | null;
  donations: { id: string; donorName: string; amount: string; paymentMethod: string; donatedAt: string }[];
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

export function CampaignDetail({ campaign }: { campaign: Campaign }) {
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

  async function handleDuplicate() {
    setPending(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/duplicate`, { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as { campaign?: Campaign };
      if (response.ok && body.campaign) router.push(`/dashboard/campaigns/${body.campaign.id}`);
    } finally {
      setPending(false);
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
                trigger={<Button variant="outline">{tCommon("edit")}</Button>}
                onSaved={refresh}
              />
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
            <Button variant="ghost" className="gap-1.5" disabled={pending} onClick={handleDuplicate}>
              <Copy className="size-4" />
              {t("actionItems.duplicate")}
            </Button>
          </>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={tDetail("stats.recipients")} value={delivery?.recipients ?? 0} />
        <StatCard label={tDetail("stats.sent")} value={delivery?.sent ?? 0} />
        <StatCard label={tDetail("stats.delivered")} value={delivery?.delivered ?? 0} />
        <StatCard label={tDetail("stats.failed")} value={delivery?.failed ?? 0} />
      </div>

      <Tabs defaultValue="overview" className="gap-4">
        <TabsList variant="line">
          <TabsTrigger value="overview">{tDetail("tabs.overview")}</TabsTrigger>
          {campaign.linkedDonationPurpose && <TabsTrigger value="donations">{tDetail("tabs.donations")}</TabsTrigger>}
          <TabsTrigger value="analytics">{tDetail("tabs.analytics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>{tDetail("aboutTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{campaign.description || tDetail("noDescription")}</p>
              {campaign.customMessage && (
                <div className="mt-4 rounded-xl border bg-muted/40 p-4 text-sm whitespace-pre-wrap">{campaign.customMessage}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {campaign.linkedDonationPurpose && (
          <TabsContent value="donations" className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatCard label={tDetail("stats.raised")} value={formatInr(Number(analytics?.donation?.totalAmount ?? 0))} />
              <StatCard label={tDetail("stats.donors")} value={analytics?.donation?.donorCount ?? 0} />
              <StatCard label={tDetail("tabs.donations")} value={analytics?.donation?.donationCount ?? 0} />
            </div>
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
                      <TableCell className="tabular-nums">{formatInr(Number(donation.amount))}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(donation.donatedAt, locale)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        )}

        <TabsContent value="analytics">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label={tDetail("stats.recipients")} value={delivery?.recipients ?? 0} />
            <StatCard label={tDetail("stats.sent")} value={delivery?.sent ?? 0} />
            <StatCard label={tDetail("stats.delivered")} value={delivery?.delivered ?? 0} />
            <StatCard label={tDetail("stats.failed")} value={delivery?.failed ?? 0} />
          </div>
          {campaign.lastRunAt && (
            <p className="mt-4 text-sm text-muted-foreground">{formatDate(campaign.lastRunAt, locale)}</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card size="sm">
      <CardContent className="space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
