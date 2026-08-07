"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Copy, ExternalLink, Eye, Link2, Megaphone, Pause, Play, Plus, Send, Trash2, XCircle } from "lucide-react";
import type { Campaign, CampaignStatus } from "@/types/db";
import { CAMPAIGN_TYPES } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableShell } from "@/components/table-shell";
import { StickyToolbar } from "@/components/sticky-toolbar";
import { EmptyState } from "@/components/empty-state";
import { SortableTableHead } from "@/components/sortable-table-head";
import { PaginationControls } from "@/components/pagination-controls";
import { PageHeader } from "@/components/page-header";
import { ResponsiveSearchBar } from "@/components/responsive-search-bar";
import { FilterBottomSheet } from "@/components/filter-bottom-sheet";
import { OverflowActionMenu, type OverflowActionMenuItem } from "@/components/overflow-action-menu";
import { MobileListView } from "@/components/mobile-list-view";
import { MobileListRow } from "@/components/mobile-list-row";
import { ExportMenu } from "@/features/export/export-menu";
import { formatDate } from "@/lib/date";
import { rowFadeIn, staggerContainer } from "@/lib/motion";
import { mergeSearchParam } from "@/lib/url-params";
import { CampaignFormDialog } from "./campaign-form-dialog";

const MotionTableRow = motion.create(TableRow);
const PATHNAME = "/dashboard/campaigns";

const STATUS_BADGE_VARIANT: Record<CampaignStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  scheduled: "outline",
  running: "default",
  paused: "outline",
  completed: "default",
  archived: "secondary",
  cancelled: "destructive",
};

interface PendingFilters {
  status: string;
  campaignType: string;
}

function filtersFromSearchParams(searchParams: URLSearchParams): PendingFilters {
  return {
    status: searchParams.get("status") ?? "all",
    campaignType: searchParams.get("campaignType") ?? "all",
  };
}

interface CampaignsTableProps {
  campaigns: Campaign[];
  page: number;
  pageSize: number;
  totalCount: number;
  /** Keyed by campaign id — only present for campaigns linked to a donation purpose (same buildDonationLink() output every WhatsApp broadcast already uses). */
  donationLinks: Record<string, string>;
}

export function CampaignsTable({ campaigns, page, pageSize, totalCount, donationLinks }: CampaignsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale() as "en" | "te";
  const t = useTranslations("campaigns");
  const tStatus = useTranslations("campaigns.status");
  const tTypes = useTranslations("campaigns.types");
  const tCommon = useTranslations("common");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingFilters, setPendingFilters] = useState<PendingFilters>(() => filtersFromSearchParams(searchParams));

  function refresh() {
    router.refresh();
  }

  function applyFilters(next: PendingFilters) {
    let params: URLSearchParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      params = mergeSearchParam(params, key, value === "all" ? null : value);
    }
    params = mergeSearchParam(params, "page", null);
    router.replace(`${PATHNAME}?${params.toString()}`);
  }

  const statusItems: Record<string, string> = { all: t("filters.allStatuses") };
  for (const status of ["draft", "scheduled", "running", "paused", "completed", "archived", "cancelled"] as CampaignStatus[]) {
    statusItems[status] = tStatus(status);
  }
  const typeItems: Record<string, string> = { all: t("filters.allTypes") };
  for (const type of CAMPAIGN_TYPES) typeItems[type] = tTypes(type);

  const activeFilterCount = Object.values(filtersFromSearchParams(searchParams)).filter((v) => v !== "all").length;

  async function handleStatusAction(campaign: Campaign, action: "pause" | "resume" | "cancel" | "archive") {
    if (action === "cancel" && !window.confirm(t("confirm.cancel"))) return;
    setError(null);
    setPendingId(campaign.id);
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
      setPendingId(null);
    }
  }

  async function handleSendNow(campaign: Campaign) {
    if (!window.confirm(t("confirm.sendNow"))) return;
    setError(null);
    setPendingId(campaign.id);
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
      setPendingId(null);
    }
  }

  async function handleCopyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("form.linkCopiedToast"));
    } catch {
      toast.error("Could not copy. Please try again.");
    }
  }

  async function handleDuplicate(campaign: Campaign) {
    setPendingId(campaign.id);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/duplicate`, { method: "POST" });
      if (response.ok) refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(campaign: Campaign) {
    if (!window.confirm(t("confirm.delete"))) return;
    setError(null);
    setPendingId(campaign.id);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
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

  function campaignActionItems(campaign: Campaign): OverflowActionMenuItem[] {
    const items: OverflowActionMenuItem[] = [
      {
        label: t("actionItems.viewDetails"),
        icon: <Eye className="size-4" />,
        onClick: () => router.push(`/dashboard/campaigns/${campaign.id}`),
      },
    ];
    if (campaign.status === "draft") {
      items.push({
        label: t("actionItems.sendNow"),
        icon: <Send className="size-4" />,
        onClick: () => handleSendNow(campaign),
      });
    }
    if (campaign.status === "running" || campaign.status === "scheduled") {
      items.push({
        label: t("actionItems.pause"),
        icon: <Pause className="size-4" />,
        onClick: () => handleStatusAction(campaign, "pause"),
      });
    }
    if (campaign.status === "paused") {
      items.push({
        label: t("actionItems.resume"),
        icon: <Play className="size-4" />,
        onClick: () => handleStatusAction(campaign, "resume"),
      });
    }
    if (["draft", "scheduled", "running", "paused"].includes(campaign.status)) {
      items.push({
        label: t("actionItems.cancel"),
        icon: <XCircle className="size-4" />,
        onClick: () => handleStatusAction(campaign, "cancel"),
      });
    }
    if (campaign.status === "completed" || campaign.status === "cancelled") {
      items.push({
        label: t("actionItems.archive"),
        icon: <Megaphone className="size-4" />,
        onClick: () => handleStatusAction(campaign, "archive"),
      });
    }
    items.push({
      label: t("actionItems.duplicate"),
      icon: <Copy className="size-4" />,
      onClick: () => handleDuplicate(campaign),
    });
    if (campaign.status === "draft") {
      items.push({
        label: tCommon("delete"),
        icon: <Trash2 className="size-4" />,
        variant: "destructive" as const,
        disabled: pendingId === campaign.id,
        onClick: () => handleDelete(campaign),
      });
    }
    return items;
  }

  return (
    <div className="space-y-6">
      <StickyToolbar>
      <PageHeader
        title={t("pageHeader.title")}
        actions={
          <ExportMenu exportUrl="/api/campaigns/export" filterParams={searchParams} selectedIds={selectedIds} moduleLabel="campaigns" />
        }
      />

      <ResponsiveSearchBar
        pathname={PATHNAME}
        placeholder={t("searchPlaceholder")}
        sticky={false}
        filtersSlot={
          <>
            <FilterBottomSheet
              title={tCommon("filters")}
              activeCount={activeFilterCount}
              onOpenChange={(open) => {
                if (open) setPendingFilters(filtersFromSearchParams(searchParams));
              }}
              onReset={() => {
                const reset: PendingFilters = { status: "all", campaignType: "all" };
                setPendingFilters(reset);
                applyFilters(reset);
              }}
              onApply={() => applyFilters(pendingFilters)}
            >
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label>{t("filters.statusLabel")}</Label>
                  <Select
                    value={pendingFilters.status}
                    onValueChange={(v) => setPendingFilters((f) => ({ ...f, status: v ?? "all" }))}
                    items={statusItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusItems).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("filters.typeLabel")}</Label>
                  <Select
                    value={pendingFilters.campaignType}
                    onValueChange={(v) => setPendingFilters((f) => ({ ...f, campaignType: v ?? "all" }))}
                    items={typeItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeItems).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FilterBottomSheet>
            <CampaignFormDialog
              mode="create"
              trigger={
                <Button className="shrink-0 gap-1.5">
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">{t("createButton")}</span>
                </Button>
              }
              onSaved={refresh}
            />
          </>
        }
      />
      </StickyToolbar>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="size-6" />}
          title={t("emptyState.title")}
          description={t("emptyState.description")}
          action={
            <CampaignFormDialog
              mode="create"
              trigger={
                <Button className="gap-1.5">
                  <Plus className="size-4" />
                  {t("createButton")}
                </Button>
              }
              onSaved={refresh}
            />
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <TableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.length > 0 && selectedIds.length === campaigns.length}
                        onCheckedChange={(checked) => setSelectedIds(checked === true ? campaigns.map((c) => c.id) : [])}
                        aria-label={t("selectAll")}
                      />
                    </TableHead>
                    <SortableTableHead column="title" label={t("columns.title")} pathname={PATHNAME} />
                    <TableHead className="hidden lg:table-cell">{t("columns.type")}</TableHead>
                    <SortableTableHead column="status" label={t("columns.status")} pathname={PATHNAME} />
                    <TableHead className="hidden lg:table-cell">{t("columns.schedule")}</TableHead>
                    <TableHead className="text-right">{t("columns.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <motion.tbody initial="hidden" animate="show" variants={staggerContainer()}>
                  {campaigns.map((campaign) => (
                    <MotionTableRow key={campaign.id} variants={rowFadeIn}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(campaign.id)}
                          onCheckedChange={(checked) =>
                            setSelectedIds((prev) =>
                              checked === true ? [...prev, campaign.id] : prev.filter((x) => x !== campaign.id),
                            )
                          }
                          aria-label={campaign.title}
                        />
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/campaigns/${campaign.id}`} className="font-medium hover:underline">
                          {campaign.title}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{tTypes(campaign.campaignType)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE_VARIANT[campaign.status]}>{tStatus(campaign.status)}</Badge>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                        {campaign.nextRunAt
                          ? formatDate(campaign.nextRunAt, locale)
                          : campaign.lastRunAt
                            ? formatDate(campaign.lastRunAt, locale)
                            : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {donationLinks[campaign.id] && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={t("actionItems.copyLink")}
                                title={t("actionItems.copyLink")}
                                onClick={() => handleCopyLink(donationLinks[campaign.id])}
                              >
                                <Link2 className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                render={
                                  <a
                                    href={donationLinks[campaign.id]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={t("actionItems.openCampaign")}
                                    title={t("actionItems.openCampaign")}
                                  />
                                }
                              >
                                <ExternalLink className="size-4" />
                              </Button>
                            </>
                          )}
                          <OverflowActionMenu items={campaignActionItems(campaign)} />
                        </div>
                      </TableCell>
                    </MotionTableRow>
                  ))}
                </motion.tbody>
              </Table>
              <PaginationControls page={page} pageSize={pageSize} totalCount={totalCount} pathname={PATHNAME} />
            </TableShell>
          </div>

          <div className="space-y-3 md:hidden">
            <MobileListView>
              {campaigns.map((campaign) => (
                <MobileListRow
                  key={campaign.id}
                  href={`/dashboard/campaigns/${campaign.id}`}
                  title={campaign.title}
                  subtitle={tTypes(campaign.campaignType)}
                  badge={<Badge variant={STATUS_BADGE_VARIANT[campaign.status]}>{tStatus(campaign.status)}</Badge>}
                  trailing={
                    <div className="flex items-center gap-1">
                      {donationLinks[campaign.id] && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={t("actionItems.copyLink")}
                            title={t("actionItems.copyLink")}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void handleCopyLink(donationLinks[campaign.id]);
                            }}
                          >
                            <Link2 className="size-4" />
                          </Button>
                          {/* A real <a> here would be invalid HTML — MobileListRow
                              wraps this entire row (including `trailing`) in its
                              own <Link>, so a nested anchor would break browser
                              click handling. window.open keeps this a <button>. */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={t("actionItems.openCampaign")}
                            title={t("actionItems.openCampaign")}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              window.open(donationLinks[campaign.id], "_blank", "noopener,noreferrer");
                            }}
                          >
                            <ExternalLink className="size-4" />
                          </Button>
                        </>
                      )}
                      <OverflowActionMenu items={campaignActionItems(campaign)} />
                    </div>
                  }
                />
              ))}
            </MobileListView>
            <PaginationControls page={page} pageSize={pageSize} totalCount={totalCount} pathname={PATHNAME} />
          </div>
        </>
      )}
    </div>
  );
}
