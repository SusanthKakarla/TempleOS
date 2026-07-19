"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { IndianRupee } from "lucide-react";
import type { DayOfWeek, TempleSeva } from "@/types/db";
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
import { cn } from "@/lib/utils";

const DAY_OPTIONS: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

interface SevaFormDialogProps {
  mode: "create" | "edit";
  seva?: TempleSeva;
  trigger: ReactElement;
  onSaved: () => void;
}

export function SevaFormDialog({ mode, seva, trigger, onSaved }: SevaFormDialogProps) {
  const t = useTranslations("chatbotSettings");
  const tForm = useTranslations("chatbotSettings.sevaFormDialog");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(seva?.name ?? "");
  const [description, setDescription] = useState(seva?.description ?? "");
  const [price, setPrice] = useState(seva?.price ?? "");
  const [duration, setDuration] = useState(seva?.duration ?? "");
  const [availableDays, setAvailableDays] = useState<DayOfWeek[]>(seva?.availableDays ?? []);
  const [bookingEnabled, setBookingEnabled] = useState(seva?.bookingEnabled ?? false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetToSeva() {
    setName(seva?.name ?? "");
    setDescription(seva?.description ?? "");
    setPrice(seva?.price ?? "");
    setDuration(seva?.duration ?? "");
    setAvailableDays(seva?.availableDays ?? []);
    setBookingEnabled(seva?.bookingEnabled ?? false);
    setError(null);
  }

  function toggleDay(day: DayOfWeek) {
    setAvailableDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const priceNumber = price === "" ? null : Number(price);
    if (price !== "" && (Number.isNaN(priceNumber) || (priceNumber ?? 0) < 0)) {
      setError(tForm("priceError"));
      return;
    }

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/temple-sevas" : `/api/temple-sevas/${seva!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          price: priceNumber,
          duration: duration || null,
          availableDays,
          bookingEnabled,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? tForm("errorFallback"));
      }

      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : tForm("errorFallback"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetToSeva();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? tForm("titleCreate") : tForm("titleEdit")}</DialogTitle>
          <DialogDescription>{tForm("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seva-name">{tForm("fields.name")}</Label>
            <Input id="seva-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seva-description">{tForm("fields.description")}</Label>
            <Textarea
              id="seva-description"
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="seva-price">{tForm("fields.price")}</Label>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="seva-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seva-duration">{tForm("fields.duration")}</Label>
              <Input
                id="seva-duration"
                placeholder={tForm("fields.durationPlaceholder")}
                value={duration ?? ""}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{tForm("availableDays.label")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {DAY_OPTIONS.map((day) => {
                const selected = availableDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-transparent text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {t(`days.${day}`)}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{tForm("availableDays.helper")}</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{tForm("bookingEnabled.label")}</p>
              <p className="text-xs text-muted-foreground">{tForm("bookingEnabled.description")}</p>
            </div>
            <Switch checked={bookingEnabled} onCheckedChange={setBookingEnabled} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
