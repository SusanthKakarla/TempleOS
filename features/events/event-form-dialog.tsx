"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { CalendarDays, MapPin, Sparkles, Type } from "lucide-react";
import type { Event, EventStatus } from "@/types/db";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { dateTimeLocalValueToIso, isoToDateTimeLocalValue } from "./datetime-local";
import { DateTimeField } from "./date-time-field";

interface EventFormDialogProps {
  mode: "create" | "edit";
  event?: Event;
  trigger: ReactElement;
  onSaved: () => void;
}

export function EventFormDialog({ mode, event, trigger, onSaved }: EventFormDialogProps) {
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
      setError("Start date/time is required");
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
        throw new Error(body.error ?? "Failed to save event");
      }

      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
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
          <DialogTitle>{mode === "create" ? "Create event" : "Edit event"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new temple event. It stays a draft until published."
              : "Update this event's details."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <div className="relative">
              <Type className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-4">
            <DateTimeField id="startsAt" label="Start" value={startsAt} onChange={setStartsAt} required />
            <DateTimeField id="endsAt" label="End (optional)" value={endsAt} onChange={setEndsAt} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-saffron" />
              <div>
                <p className="text-sm font-medium">Published</p>
                <p className="text-xs text-muted-foreground">Visible to devotees on WhatsApp.</p>
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
                Preview
              </p>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(previewDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                {location ? ` · ${location}` : ""}
              </p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
