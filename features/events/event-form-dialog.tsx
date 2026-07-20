"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, MapPin, Sparkles, Type } from "lucide-react";
import type { Event, EventStatus, SupportedLanguage } from "@/types/db";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { formatDateTime } from "@/lib/date";
import { dateTimeLocalValueToIso, isoToDateTimeLocalValue } from "./datetime-local";
import { DateTimeField } from "./date-time-field";

interface EventFormDialogProps {
  mode: "create" | "edit";
  event?: Event;
  trigger: ReactElement;
  onSaved: () => void;
}

export function EventFormDialog({ mode, event, trigger, onSaved }: EventFormDialogProps) {
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("events.formDialog");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [startsAt, setStartsAt] = useState(isoToDateTimeLocalValue(event?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(isoToDateTimeLocalValue(event?.endsAt ?? null));
  const [status, setStatus] = useState<EventStatus>(event?.status ?? "draft");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetToEvent() {
    setTitle(event?.title ?? "");
    setDescription(event?.description ?? "");
    setLocation(event?.location ?? "");
    setStartsAt(isoToDateTimeLocalValue(event?.startsAt ?? null));
    setEndsAt(isoToDateTimeLocalValue(event?.endsAt ?? null));
    setStatus(event?.status ?? "draft");
    setError(null);
  }

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    setError(null);

    const startsAtIso = dateTimeLocalValueToIso(startsAt);
    if (!startsAtIso) {
      setError(t("startRequired"));
      return;
    }
    const endsAtIso = dateTimeLocalValueToIso(endsAt);

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/events" : `/api/events/${event!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          location,
          startsAt: startsAtIso,
          endsAt: endsAtIso,
          status,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("errorFallback"));
      }

      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  const previewDate = dateTimeLocalValueToIso(startsAt);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetToEvent();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("createTitle") : t("editTitle")}</DialogTitle>
          <DialogDescription>{mode === "create" ? t("createDescription") : t("editDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FloatingLabelInput
            id="title"
            label={t("fields.title")}
            icon={<Type />}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div className="space-y-2">
            <Label htmlFor="description">{t("fields.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <FloatingLabelInput
            id="location"
            label={t("fields.location")}
            icon={<MapPin />}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <div className="space-y-4">
            <DateTimeField id="startsAt" label={t("fields.start")} value={startsAt} onChange={setStartsAt} required />
            <DateTimeField id="endsAt" label={t("fields.end")} value={endsAt} onChange={setEndsAt} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-saffron" />
              <div>
                <p className="text-sm font-medium">{t("published.label")}</p>
                <p className="text-xs text-muted-foreground">{t("published.description")}</p>
              </div>
            </div>
            <Switch
              checked={status === "published"}
              onCheckedChange={(checked) => setStatus(checked ? "published" : "draft")}
            />
          </div>

          {title && previewDate && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <CalendarDays className="size-3.5" />
                {t("preview")}
              </p>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(previewDate, locale)}
                {location ? ` · ${location}` : ""}
              </p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? tCommon("saving") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
