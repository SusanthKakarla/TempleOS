"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, Sparkles } from "lucide-react";
import type { TempleSpecialDay } from "@/types/db";
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
import { Switch } from "@/components/ui/switch";

/** Postgres TIME comes back as "HH:MM:SS"; <input type="time"> wants "HH:MM". */
function toInputTime(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "";
}

interface SpecialDayFormDialogProps {
  mode: "create" | "edit";
  specialDay?: TempleSpecialDay;
  trigger: ReactElement;
  onSaved: () => void;
}

export function SpecialDayFormDialog({ mode, specialDay, trigger, onSaved }: SpecialDayFormDialogProps) {
  const t = useTranslations("chatbotSettings");
  const tForm = useTranslations("chatbotSettings.specialDayFormDialog");
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(specialDay?.date ?? "");
  const [occasion, setOccasion] = useState(specialDay?.occasion ?? "");
  const [isClosed, setIsClosed] = useState(specialDay?.isClosed ?? false);
  const [morningOpen, setMorningOpen] = useState(toInputTime(specialDay?.morningOpen));
  const [morningClose, setMorningClose] = useState(toInputTime(specialDay?.morningClose));
  const [eveningOpen, setEveningOpen] = useState(toInputTime(specialDay?.eveningOpen));
  const [eveningClose, setEveningClose] = useState(toInputTime(specialDay?.eveningClose));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetToSpecialDay() {
    setDate(specialDay?.date ?? "");
    setOccasion(specialDay?.occasion ?? "");
    setIsClosed(specialDay?.isClosed ?? false);
    setMorningOpen(toInputTime(specialDay?.morningOpen));
    setMorningClose(toInputTime(specialDay?.morningClose));
    setEveningOpen(toInputTime(specialDay?.eveningOpen));
    setEveningClose(toInputTime(specialDay?.eveningClose));
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/temple-special-days" : `/api/temple-special-days/${specialDay!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          occasion,
          isClosed,
          morningOpen: isClosed ? "" : morningOpen,
          morningClose: isClosed ? "" : morningClose,
          eveningOpen: isClosed ? "" : eveningOpen,
          eveningClose: isClosed ? "" : eveningClose,
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
        if (next) resetToSpecialDay();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? tForm("titleCreate") : tForm("titleEdit")}</DialogTitle>
          <DialogDescription>{tForm("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="special-day-date">{tForm("fields.date")}</Label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="special-day-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="special-day-occasion">{tForm("fields.occasion")}</Label>
              <div className="relative">
                <Sparkles className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="special-day-occasion"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{tForm("closedToggle.label")}</p>
              <p className="text-xs text-muted-foreground">{tForm("closedToggle.description")}</p>
            </div>
            <Switch checked={isClosed} onCheckedChange={setIsClosed} />
          </div>

          {!isClosed && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="special-morning-open">{t("timingsForm.fields.morningOpen")}</Label>
                  <Input
                    id="special-morning-open"
                    type="time"
                    value={morningOpen}
                    onChange={(e) => setMorningOpen(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="special-morning-close">{t("timingsForm.fields.morningClose")}</Label>
                  <Input
                    id="special-morning-close"
                    type="time"
                    value={morningClose}
                    onChange={(e) => setMorningClose(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="special-evening-open">{t("timingsForm.fields.eveningOpen")}</Label>
                  <Input
                    id="special-evening-open"
                    type="time"
                    value={eveningOpen}
                    onChange={(e) => setEveningOpen(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="special-evening-close">{t("timingsForm.fields.eveningClose")}</Label>
                  <Input
                    id="special-evening-close"
                    type="time"
                    value={eveningClose}
                    onChange={(e) => setEveningClose(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{tForm("helperText")}</p>
            </>
          )}

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
