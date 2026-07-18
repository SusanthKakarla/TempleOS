"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import type { Event, EventStatus } from "@/types/db";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EventFormDialog } from "./event-form-dialog";
import { AnnounceDialog } from "./announce-dialog";

const STATUS_BADGE_VARIANT: Record<EventStatus, "default" | "secondary" | "destructive"> = {
  published: "default",
  draft: "secondary",
  cancelled: "destructive",
};

function formatEventTime(event: Event): string {
  const start = new Date(event.startsAt);
  const startLabel = start.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  if (!event.endsAt) return startLabel;
  const end = new Date(event.endsAt);
  return `${startLabel} - ${end.toLocaleTimeString("en-IN", { timeStyle: "short" })}`;
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
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      <Card className="h-full gap-3 overflow-hidden py-0">
        <div className="gradient-maroon-orange h-1.5 w-full" />
        <CardHeader className="pt-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-heading text-base font-semibold leading-snug">{event.title}</h3>
            <Badge variant={STATUS_BADGE_VARIANT[event.status]} className="shrink-0">
              {event.status}
            </Badge>
          </div>
          {event.status !== "draft" && (
            <Link
              href={`/dashboard/notifications?eventId=${event.id}`}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Notifications
            </Link>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {event.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <CalendarDays className="size-3.5 text-saffron" />
              {formatEventTime(event)}
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
            <span className="text-xs text-muted-foreground">Cancelled</span>
          ) : (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                checked={event.status === "published"}
                disabled={pending}
                onCheckedChange={() => onTogglePublish(event)}
              />
              Published
            </label>
          )}
          <div className="flex items-center gap-1.5">
            <EventFormDialog
              mode="edit"
              event={event}
              onSaved={onSaved}
              trigger={
                <Button variant="ghost" size="sm" disabled={pending}>
                  Edit
                </Button>
              }
            />
            {event.status === "published" && (
              <AnnounceDialog
                event={event}
                onAnnounced={onSaved}
                trigger={
                  <Button variant="ghost" size="sm" disabled={pending}>
                    Announce
                  </Button>
                }
              />
            )}
            {event.status === "cancelled" ? (
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => onReopen(event)}>
                Reopen
              </Button>
            ) : (
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => onCancel(event)}>
                Cancel
              </Button>
            )}
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => onDelete(event)}>
              Delete
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
