"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Cake, Eye, Heart, MessageCircle, PartyPopper, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { maskPhoneForDisplay } from "@/lib/phone.mts";
import type { UpcomingOccasion } from "@/lib/dashboard-upcoming-occasions";

interface UpcomingOccasionsWidgetProps {
  occasions: UpcomingOccasion[];
}

type FilterValue = "all" | "birthday" | "anniversary" | "today" | "week" | "month";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

/** Group bucket an occasion falls into, by daysUntil — matches the brief's Today/Tomorrow/This Week/Next 30 Days grouping. */
function bucketFor(daysUntil: number): "today" | "tomorrow" | "thisWeek" | "later" {
  if (daysUntil === 0) return "today";
  if (daysUntil === 1) return "tomorrow";
  if (daysUntil <= 7) return "thisWeek";
  return "later";
}

const BUCKET_ORDER = ["today", "tomorrow", "thisWeek", "later"] as const;

function whatsAppHref(phone: string, message: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Reads purely from the pre-computed `occasions` list (features/dashboard's
 * server page already called the shared getUpcomingOccasions() service) —
 * this component does no date/age arithmetic of its own, only
 * filtering/grouping/rendering already-computed data.
 */
export function UpcomingOccasionsWidget({ occasions }: UpcomingOccasionsWidgetProps) {
  const t = useTranslations("dashboardHome.upcomingOccasions");
  const [filter, setFilter] = useState<FilterValue>("all");

  const filtered = useMemo(() => {
    return occasions.filter((occasion) => {
      if (filter === "birthday" && occasion.kind !== "birthday") return false;
      if (filter === "anniversary" && occasion.kind !== "anniversary") return false;
      if (filter === "today" && occasion.daysUntil !== 0) return false;
      if (filter === "week" && occasion.daysUntil > 7) return false;
      if (filter === "month" && occasion.daysUntil > 30) return false;
      return true;
    });
  }, [occasions, filter]);

  const grouped = useMemo(() => {
    const groups: Record<string, UpcomingOccasion[]> = { today: [], tomorrow: [], thisWeek: [], later: [] };
    for (const occasion of filtered) {
      groups[bucketFor(occasion.daysUntil)].push(occasion);
    }
    return groups;
  }, [filtered]);

  const filters: { value: FilterValue; label: string }[] = [
    { value: "all", label: t("filters.all") },
    { value: "birthday", label: t("filters.birthdays") },
    { value: "anniversary", label: t("filters.anniversaries") },
    { value: "today", label: t("filters.today") },
    { value: "week", label: t("filters.next7Days") },
    { value: "month", label: t("filters.next30Days") },
  ];

  return (
    <Card className="glass-card gap-3 overflow-hidden rounded-3xl p-5 shadow-sm">
      <CardHeader className="flex-col items-start gap-3 p-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">🎂 {t("title")}</CardTitle>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                filter === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <EmptyState icon={<PartyPopper className="size-6" />} title={t("emptyState")} />
        ) : (
          <div className="max-h-[420px] space-y-5 overflow-y-auto pr-1">
            {BUCKET_ORDER.filter((bucket) => grouped[bucket].length > 0).map((bucket) => (
              <div key={bucket} className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t(`groups.${bucket}`)}</p>
                <div className="space-y-2">
                  {grouped[bucket].map((occasion) => (
                    <OccasionRow key={`${occasion.kind}-${occasion.devoteeId}`} occasion={occasion} t={t} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OccasionRow({ occasion, t }: { occasion: UpcomingOccasion; t: ReturnType<typeof useTranslations> }) {
  const isBirthday = occasion.kind === "birthday";
  const message = isBirthday ? t("wishBirthday", { name: occasion.name }) : t("wishAnniversary", { name: occasion.name });

  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-background/60 p-3">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
          isBirthday ? "bg-amber-500/10 text-amber-600" : "bg-rose-500/10 text-rose-600",
        )}
      >
        {getInitials(occasion.name)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-medium">{occasion.name}</p>
          <Badge variant="secondary" className="gap-1 text-xs">
            {isBirthday ? <Cake className="size-3" /> : <Heart className="size-3" />}
            {isBirthday ? t("badgeBirthday") : t("badgeAnniversary")}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {isBirthday ? t("ageLabel", { age: occasion.age ?? 0 }) : t("yearsLabel", { years: occasion.years ?? 0 })}
          {occasion.familyName ? ` · ${occasion.familyName}` : ""}
          {occasion.phone ? ` · ${maskPhoneForDisplay(occasion.phone)}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {occasion.phone && (
          <>
            <Button variant="ghost" size="icon-sm" render={<a href={`tel:${occasion.phone}`} aria-label={t("actions.call")} />}>
              <Phone className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              render={<a href={whatsAppHref(occasion.phone, message)} target="_blank" rel="noopener noreferrer" aria-label={t("actions.whatsapp")} />}
            >
              <MessageCircle className="size-3.5" />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href={`/dashboard/devotees/${occasion.devoteeId}`} aria-label={t("actions.view")} />}
        >
          <Eye className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
