"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarIcon, ClockIcon } from "lucide-react";
import type { SupportedLanguage } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/date";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function splitValue(value: string): { datePart: string; timePart: string } {
  return { datePart: value.slice(0, 10), timePart: value.slice(11, 16) };
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const locale = useLocale() as SupportedLanguage;
  const t = useTranslations("events.formDialog");
  const { datePart, timePart } = splitValue(value);
  const selectedDate = toDate(datePart);

  function handleDateSelect(date: Date | undefined) {
    if (!date) return;
    const nextDatePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    onChange(`${nextDatePart}T${timePart || "09:00"}`);
  }

  function handleTimeChange(nextTimePart: string) {
    const nextDatePart = datePart || `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;
    onChange(`${nextDatePart}T${nextTimePart}`);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Popover>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                id={id}
                className="flex-1 justify-start gap-2 font-normal"
              >
                <CalendarIcon className="size-4 text-muted-foreground" />
                {selectedDate ? formatDate(selectedDate, locale) : t("pickDate")}
              </Button>
            }
          />
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={selectedDate} onSelect={handleDateSelect} autoFocus />
          </PopoverContent>
        </Popover>
        <div className="relative w-full shrink-0 sm:w-32">
          <ClockIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="time"
            value={timePart}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="pl-8 [&::-webkit-calendar-picker-indicator]:pointer-events-none [&::-webkit-calendar-picker-indicator]:opacity-0"
            required={required}
          />
        </div>
      </div>
    </div>
  );
}
