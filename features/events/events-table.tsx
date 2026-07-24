"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { CalendarDays, LayoutGrid, PlusCircle, Rows3 } from "lucide-react";
import type { Event, EventStatus, SupportedLanguage } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableShell } from "@/components/table-shell";
import { EmptyState } from "@/components/empty-state";
import { SortableTableHead } from "@/components/sortable-table-head";
import { PaginationControls } from "@/components/pagination-controls";
import { PageHeader } from "@/components/page-header";
import { FilterBottomSheet } from "@/components/filter-bottom-sheet";
import { ExportMenu } from "@/features/export/export-menu";
import { formatDateTime, formatTime } from "@/lib/date";
import { rowFadeIn, staggerContainer } from "@/lib/motion";
import { mergeSearchParam } from "@/lib/url-params";
import { EventFormDialog } from "./event-form-dialog";
import { EventCard } from "./event-card";
import { AnnounceDialog } from "./announce-dialog";

const PATHNAME = "/dashboard/events";

interface PendingFilters {
  when: string;
  status: string;
}

function filtersFromSearchParams(searchParams: URLSearchParams): PendingFilters {
  return {
    when: searchParams.get("when") ?? "all",
    status: searchParams.get("status") ?? "all",
  };
}

const MotionTableRow = motion.create(TableRow);

const STATUS_BADGE_VARIANT: Record<EventStatus, "default" | "secondary" | "destructive"> = {
  published: "default",
  draft: "secondary",
  cancelled: "destructive",
};

function formatEventTime(event: Event, locale: SupportedLanguage): string {
  const startLabel = formatDateTime(event.startsAt, locale);
  if (!event.endsAt) return startLabel;
  const endLabel = formatTime(event.endsAt, locale);
  return `${startLabel} - ${endLabel}`;
}

interface EventsTableProps {
  events: Event[];
  page: number;
  pageSize: number;
  totalCount: number;
  sort?: "date" | "title" | "status";
  dir: "asc" | "desc";
}

export function EventsTable({ events, page, pageSize, totalCount, sort, dir }: EventsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const [view, setView] = useState<"table" | "card">("table");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingFilters, setPendingFilters] = useState<PendingFilters>(() => filtersFromSearchParams(searchParams));

  function applyFilters(next: PendingFilters) {
    let params: URLSearchParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      params = mergeSearchParam(params, key, value === "all" ? null : value);
    }
    params = mergeSearchParam(params, "page", null);
    router.replace(`${PATHNAME}?${params.toString()}`);
  }

  const whenItems: Record<string, string> = {
    all: t("filters.allEvents"),
    upcoming: t("filters.upcomingOnly"),
  };
  const statusItems: Record<string, string> = {
    all: t("filters.allStatuses"),
    published: t("status.published"),
    draft: t("status.draft"),
    cancelled: t("status.cancelled"),
  };
  const activeFilterCount = Object.values(filtersFromSearchParams(searchParams)).filter((v) => v !== "all").length;

  function refresh() {
    router.refresh();
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? events.map((e) => e.id) : []);
  }

  async function handleSetStatus(event: Event, status: EventStatus) {
    setError(null);
    setPendingId(event.id);
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("updateError"));
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("updateError"));
    } finally {
      setPendingId(null);
    }
  }

  function handleTogglePublish(event: Event) {
    return handleSetStatus(event, event.status === "published" ? "draft" : "published");
  }

  function handleCancel(event: Event) {
    if (!window.confirm(t("confirmCancel", { title: event.title }))) return;
    return handleSetStatus(event, "cancelled");
  }

  function handleReopen(event: Event) {
    return handleSetStatus(event, "draft");
  }

  async function handleDelete(event: Event) {
    if (!window.confirm(t("confirmDelete", { title: event.title }))) return;
    setError(null);
    setPendingId(event.id);
    try {
      const response = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageHeader.title")}
        subtitle={t("pageHeader.subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as "table" | "card")} className="hidden md:block">
              <TabsList>
                <TabsTrigger value="table">
                  <Rows3 className="size-3.5" />
                  {t("viewTabs.table")}
                </TabsTrigger>
                <TabsTrigger value="card">
                  <LayoutGrid className="size-3.5" />
                  {t("viewTabs.card")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <ExportMenu exportUrl="/api/events/export" selectedIds={selectedIds} moduleLabel="events" />
            <FilterBottomSheet
              title={tCommon("filters")}
              activeCount={activeFilterCount}
              onOpenChange={(open) => {
                if (open) setPendingFilters(filtersFromSearchParams(searchParams));
              }}
              onReset={() => {
                const reset: PendingFilters = { when: "all", status: "all" };
                setPendingFilters(reset);
                applyFilters(reset);
              }}
              onApply={() => applyFilters(pendingFilters)}
            >
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label>{t("filters.whenLabel")}</Label>
                  <Select
                    value={pendingFilters.when}
                    onValueChange={(v) => setPendingFilters((f) => ({ ...f, when: v ?? "all" }))}
                    items={whenItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(whenItems).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              </div>
            </FilterBottomSheet>
            <EventFormDialog
              mode="create"
              trigger={
                <Button className="gap-1.5">
                  <PlusCircle className="size-4" />
                  {t("createButton")}
                </Button>
              }
              onSaved={refresh}
            />
          </div>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-6" />}
          title={t("emptyState.title")}
          description={t("emptyState.description")}
          action={
            <EventFormDialog
              mode="create"
              trigger={
                <Button className="gap-1.5">
                  <PlusCircle className="size-4" />
                  {t("createButton")}
                </Button>
              }
              onSaved={refresh}
            />
          }
        />
      ) : (
        <>
          {/* Mobile always uses the card view — the table/card toggle is desktop/tablet only. */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={staggerContainer()}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:hidden"
          >
            {events.map((event) => (
              <motion.div key={event.id} variants={rowFadeIn}>
                <EventCard
                  event={event}
                  pending={pendingId === event.id}
                  onSaved={refresh}
                  onTogglePublish={handleTogglePublish}
                  onCancel={handleCancel}
                  onReopen={handleReopen}
                  onDelete={handleDelete}
                />
              </motion.div>
            ))}
          </motion.div>
          <div className="md:hidden">
            <PaginationControls page={page} pageSize={pageSize} totalCount={totalCount} pathname={PATHNAME} />
          </div>

          <div className="hidden md:block">
            {view === "card" ? (
              <>
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={staggerContainer()}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {events.map((event) => (
                    <motion.div key={event.id} variants={rowFadeIn}>
                      <EventCard
                        event={event}
                        pending={pendingId === event.id}
                        onSaved={refresh}
                        onTogglePublish={handleTogglePublish}
                        onCancel={handleCancel}
                        onReopen={handleReopen}
                        onDelete={handleDelete}
                      />
                    </motion.div>
                  ))}
                </motion.div>
                <PaginationControls page={page} pageSize={pageSize} totalCount={totalCount} pathname={PATHNAME} />
              </>
            ) : (
              <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.length > 0 && selectedIds.length === events.length}
                    onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                    aria-label={t("selectAll")}
                  />
                </TableHead>
                <SortableTableHead
                  column="title"
                  label={t("columns.title")}
                  currentSort={sort}
                  currentDir={dir}
                  pathname="/dashboard/events"
                />
                <SortableTableHead
                  column="date"
                  label={t("columns.when")}
                  currentSort={sort}
                  currentDir={dir}
                  pathname="/dashboard/events"
                />
                <TableHead>{t("columns.location")}</TableHead>
                <SortableTableHead
                  column="status"
                  label={t("columns.status")}
                  currentSort={sort}
                  currentDir={dir}
                  pathname="/dashboard/events"
                />
                <TableHead className="text-right">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <motion.tbody initial="hidden" animate="show" variants={staggerContainer()}>
              {events.map((event) => (
                <MotionTableRow key={event.id} variants={rowFadeIn}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(event.id)}
                      onCheckedChange={(checked) => toggleSelected(event.id, checked === true)}
                      aria-label={t("selectRow", { title: event.title })}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell>{formatEventTime(event, locale)}</TableCell>
                  <TableCell>{event.location ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[event.status]}>{t(`status.${event.status}`)}</Badge>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <EventFormDialog
                      mode="edit"
                      event={event}
                      trigger={
                        <Button variant="outline" size="sm" disabled={pendingId === event.id}>
                          {tCommon("edit")}
                        </Button>
                      }
                      onSaved={refresh}
                    />
                    {event.status === "cancelled" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pendingId === event.id}
                        onClick={() => handleReopen(event)}
                      >
                        {t("buttons.reopen")}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pendingId === event.id}
                          onClick={() => handleTogglePublish(event)}
                        >
                          {event.status === "published" ? t("buttons.unpublish") : t("buttons.publish")}
                        </Button>
                        {event.status === "published" && (
                          <AnnounceDialog
                            event={event}
                            onAnnounced={refresh}
                            trigger={
                              <Button variant="outline" size="sm" disabled={pendingId === event.id}>
                                {t("buttons.announce")}
                              </Button>
                            }
                          />
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pendingId === event.id}
                          onClick={() => handleCancel(event)}
                        >
                          {tCommon("cancel")}
                        </Button>
                      </>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={pendingId === event.id}
                      onClick={() => handleDelete(event)}
                    >
                      {tCommon("delete")}
                    </Button>
                  </TableCell>
                </MotionTableRow>
              ))}
                </motion.tbody>
              </Table>
              <PaginationControls page={page} pageSize={pageSize} totalCount={totalCount} pathname="/dashboard/events" />
              </TableShell>
            )}
          </div>
        </>
      )}
    </div>
  );
}
