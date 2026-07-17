"use client";

import { CalendarIcon, ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
      <label htmlFor={id} className="text-sm leading-none font-medium">
        {label}
      </label>
      <div className="flex gap-2">
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
                {selectedDate ? selectedDate.toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Pick a date"}
              </Button>
            }
          />
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={selectedDate} onSelect={handleDateSelect} autoFocus />
          </PopoverContent>
        </Popover>
        <div className="relative w-32 shrink-0">
          <ClockIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="time"
            value={timePart}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="pl-8"
            required={required}
          />
        </div>
      </div>
    </div>
  );
}
