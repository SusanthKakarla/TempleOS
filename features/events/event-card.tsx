"use client";

import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, MapPin } from "lucide-react";
import type { Event, EventStatus, SupportedLanguage } from "@/types/db";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatDateTime, formatTime } from "@/lib/date";
import { springSoft } from "@/lib/motion";
import { EventFormDialog } from "./event-form-dialog";
import { AnnounceDialog } from "./announce-dialog";

const STATUS_BADGE_VARIANT: Record<EventStatus, "default" | "secondary" | "destructive"> = {
  published: "default",
  draft: "secondary",
  cancelled: "destructive",
};

function formatEventTime(event: Event, locale: SupportedLanguage): string {
  const startLabel = formatDateTime(event.startsAt, locale);
  if (!event.endsAt) return startLabel;
  return `${startLabel} - ${formatTime(event.endsAt, locale)}`;
}

interface EventCardProps {
  event: Event;
  pending: boolean;
  onSaved: () => void;
  onTogglePublish: (event: Event) => void;
  onCancel: (event: Event) => void;
  onReopen: (event: Event) => void;
  onDelete: (event: Event) => void;
}

export function EventCard({
  event,
  pending,
  onSaved,
  onTogglePublish,
  onCancel,
  onReopen,
  onDelete,
}: EventCardProps) {
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  return (
    <motion.div whileHover={{ y: -3 }} transition={springSoft}>
      <Card className="glass-card h-full gap-3 overflow-hidden rounded-2xl py-0">
        <div className="gradient-maroon-orange h-1.5 w-full" />
        <CardHeader className="pt-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-heading text-base font-semibold leading-snug">{event.title}</h3>
            <Badge variant={STATUS_BADGE_VARIANT[event.status]} className="shrink-0">
              {t(`status.${event.status}`)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-2">
          {event.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <CalendarDays className="size-3.5 text-saffron" />
              {formatEventTime(event, locale)}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <MapPin className="size-3.5 text-royal-blue" />
                {event.location}
              </span>
            )}
          </div>
        </CardContent>
        <CardFooter className="mt-1 flex items-center justify-between gap-2 border-t py-3">
          {event.status === "cancelled" ? (
            <span className="text-xs text-muted-foreground">{t("cancelledLabel")}</span>
          ) : (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                checked={event.status === "published"}
                disabled={pending}
                onCheckedChange={() => onTogglePublish(event)}
              />
              {t("publishedLabel")}
            </label>
          )}
          <div className="flex items-center gap-1.5">
            <EventFormDialog
              mode="edit"
              event={event}
              onSaved={onSaved}
              trigger={
                <Button variant="ghost" size="sm" disabled={pending}>
                  {tCommon("edit")}
                </Button>
              }
            />
            {event.status === "published" && (
              <AnnounceDialog
                event={event}
                onAnnounced={onSaved}
                trigger={
                  <Button variant="ghost" size="sm" disabled={pending}>
                    {t("buttons.announce")}
                  </Button>
                }
              />
            )}
            {event.status === "cancelled" ? (
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => onReopen(event)}>
                {t("buttons.reopen")}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => onCancel(event)}>
                {tCommon("cancel")}
              </Button>
            )}
            <Button variant="destructive" size="sm" disabled={pending} onClick={() => onDelete(event)}>
              {tCommon("delete")}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
