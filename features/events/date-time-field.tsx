"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { parseISODate, toISODateString } from "@/lib/date";

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
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
  const datePart = value.slice(0, 10);

  function handleDateChange(nextDatePart: string) {
    const date = parseISODate(nextDatePart);
    if (!date) return;
    onChange(`${toISODateString(date)}T09:00`);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="justify-between">
        <span>{label}</span>
        {required && requiredLabel && (
          <span className="text-xs font-normal text-muted-foreground">{requiredLabel}</span>
        )}
      </Label>
      <DatePicker
        id={id}
        value={datePart}
        onChange={handleDateChange}
        size={size === "lg" ? "lg" : "default"}
        required={required}
        className={size === "lg" ? "h-10" : undefined}
        minDate={allowPastDates ? undefined : startOfToday()}
      />
    </div>
  );
}
