"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarIcon } from "lucide-react";
import type { SupportedLanguage } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/date";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function splitValue(value: string): { datePart: string } {
  return { datePart: value.slice(0, 10) };
}

function toDate(datePart: string): Date | undefined {
  if (!datePart) return undefined;
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

export function DateTimeField({
  id,
  label,
  value,
  onChange,
  required,
  requiredLabel,
  size = "default",
  allowPastDates = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** Text shown next to the label when `required` is set (e.g. the localized word for "Required") — omit to show no indicator at all. */
  requiredLabel?: string;
  size?: "default" | "lg";
  allowPastDates?: boolean;
}) {
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("events.formDialog");
  const { datePart } = splitValue(value);
  const selectedDate = toDate(datePart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function handleDateSelect(date: Date | undefined) {
    if (!date) return;
    const nextDatePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    onChange(`${nextDatePart}T09:00`);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="justify-between">
        <span>{label}</span>
        {required && requiredLabel && (
          <span className="text-xs font-normal text-muted-foreground">{requiredLabel}</span>
        )}
      </Label>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size={size === "lg" ? "lg" : "default"}
              id={id}
              className={`w-full justify-start gap-2 font-normal${size === "lg" ? " h-10" : ""}`}
            >
              <CalendarIcon className="size-4 text-muted-foreground" />
              {selectedDate ? formatDate(selectedDate, locale) : t("pickDate")}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={allowPastDates ? undefined : { before: today }}
            startMonth={allowPastDates ? new Date(1900, 0) : today}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
