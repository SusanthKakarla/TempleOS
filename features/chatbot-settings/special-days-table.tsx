"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Plus } from "lucide-react";
import type { SupportedLanguage, TempleSpecialDay } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MobileListView } from "@/components/mobile-list-view";
import { MobileListRow } from "@/components/mobile-list-row";
import { formatDate as formatDateLocalized } from "@/lib/date";
import { SpecialDayFormDialog } from "./special-day-form-dialog";

function formatDate(iso: string, locale: SupportedLanguage): string {
  // "YYYY-MM-DD" — construct as UTC noon to avoid local-timezone rollback.
  return formatDateLocalized(new Date(`${iso}T12:00:00Z`), locale);
}

function formatTime(value: string | null, amLabel: string, pmLabel: string): string {
  if (!value) return "—";
  const [hourStr, minuteStr] = value.split(":");
  const hour24 = Number(hourStr);
  const period = hour24 >= 12 ? pmLabel : amLabel;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minuteStr} ${period}`;
}

function formatTimings(specialDay: TempleSpecialDay, t: ReturnType<typeof useTranslations>): string {
  if (specialDay.isClosed) return t("closedBadge");
  const am = t("am");
  const pm = t("pm");
  const morning =
    specialDay.morningOpen && specialDay.morningClose
      ? `${formatTime(specialDay.morningOpen, am, pm)} - ${formatTime(specialDay.morningClose, am, pm)}`
      : null;
  const evening =
    specialDay.eveningOpen && specialDay.eveningClose
      ? `${formatTime(specialDay.eveningOpen, am, pm)} - ${formatTime(specialDay.eveningClose, am, pm)}`
      : null;
  return [morning, evening].filter(Boolean).join(" · ") || t("regularHours");
}

export function SpecialDaysTable({ specialDays }: { specialDays: TempleSpecialDay[] }) {
  const router = useRouter();
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("chatbotSettings.specialDaysTable");
  const tCommon = useTranslations("chatbotSettings.common");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleDelete(specialDay: TempleSpecialDay) {
    if (!window.confirm(t("deleteConfirm", { occasion: specialDay.occasion }))) return;
    setError(null);
    setPendingId(specialDay.id);
    try {
      const response = await fetch(`/api/temple-special-days/${specialDay.id}`, { method: "DELETE" });
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
    <Card className="glass-card overflow-hidden rounded-2xl">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>{t("cardTitle")}</CardTitle>
          <CardDescription>{t("cardDescription")}</CardDescription>
        </div>
        <SpecialDayFormDialog
          mode="create"
          trigger={
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" />
              {t("addButton")}
            </Button>
          }
          onSaved={refresh}
        />
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        {specialDays.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <CalendarDays className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
          </div>
        ) : (
          <>
            <div className="hidden rounded-xl border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columns.date")}</TableHead>
                    <TableHead>{t("columns.occasion")}</TableHead>
                    <TableHead>{t("columns.timings")}</TableHead>
                    <TableHead className="text-right">{t("columns.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specialDays.map((specialDay) => (
                    <TableRow key={specialDay.id}>
                      <TableCell>{formatDate(specialDay.date, locale)}</TableCell>
                      <TableCell>{specialDay.occasion}</TableCell>
                      <TableCell>
                        {specialDay.isClosed ? (
                          <Badge variant="destructive">{t("closedBadge")}</Badge>
                        ) : (
                          formatTimings(specialDay, t)
                        )}
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <SpecialDayFormDialog
                          mode="edit"
                          specialDay={specialDay}
                          trigger={
                            <Button variant="outline" size="sm" disabled={pendingId === specialDay.id}>
                              {tCommon("edit")}
                            </Button>
                          }
                          onSaved={refresh}
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={pendingId === specialDay.id}
                          onClick={() => handleDelete(specialDay)}
                        >
                          {tCommon("delete")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden">
              <MobileListView>
                {specialDays.map((specialDay) => (
                  <MobileListRow
                    key={specialDay.id}
                    title={specialDay.occasion}
                    subtitle={formatDate(specialDay.date, locale)}
                    badge={
                      specialDay.isClosed ? (
                        <Badge variant="destructive">{t("closedBadge")}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{formatTimings(specialDay, t)}</span>
                      )
                    }
                    trailing={
                      <div className="flex shrink-0 gap-2">
                        <SpecialDayFormDialog
                          mode="edit"
                          specialDay={specialDay}
                          trigger={
                            <Button variant="outline" size="sm" disabled={pendingId === specialDay.id}>
                              {tCommon("edit")}
                            </Button>
                          }
                          onSaved={refresh}
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={pendingId === specialDay.id}
                          onClick={() => handleDelete(specialDay)}
                        >
                          {tCommon("delete")}
                        </Button>
                      </div>
                    }
                  />
                ))}
              </MobileListView>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
