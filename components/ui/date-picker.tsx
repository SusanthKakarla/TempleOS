"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react";
import type { SupportedLanguage } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDate, parseISODate, toISODateString } from "@/lib/date";

type PickerView = "days" | "months" | "years";

const DEFAULT_FROM_YEAR = 1900;
const DEFAULT_YEAR_SPAN_AHEAD = 100;

/** Popover's default initial-focus (first tabbable element) would grab our header's prev-month chevron instead of the day react-day-picker itself wants focused (today/selected, via its own `autoFocus` mechanism) — point it at that day explicitly instead. Only relevant on the "days" view, since the popover always opens into that view. */
function focusInitialCalendarDay(): HTMLElement | undefined {
  return document.querySelector<HTMLElement>('[data-slot="popover-content"] [data-focus-target]') ?? undefined;
}

function useMonthLabels(locale: string, format: "long" | "short"): string[] {
  return React.useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) =>
        new Intl.DateTimeFormat(locale, { month: format }).format(new Date(2000, month, 1))
      ),
    [locale, format]
  );
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

interface CalendarNavHeaderProps {
  displayMonth: Date;
  view: PickerView;
  onViewChange: (view: PickerView) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  locale: string;
}

function CalendarNavHeader({
  displayMonth,
  view,
  onViewChange,
  onPrevMonth,
  onNextMonth,
  prevDisabled,
  nextDisabled,
  locale,
}: CalendarNavHeaderProps) {
  const t = useTranslations("common.datePicker");
  const monthLabel = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long" }).format(displayMonth),
    [locale, displayMonth]
  );

  return (
    <div className="flex h-10 items-center justify-between gap-1 px-1">
      {view === "days" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={onPrevMonth}
          disabled={prevDisabled}
          aria-label={t("previousMonth")}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
      ) : (
        <span className="size-7 shrink-0" aria-hidden="true" />
      )}
      <div className="flex flex-1 items-center justify-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 font-medium"
          onClick={() => onViewChange(view === "months" ? "days" : "months")}
          aria-haspopup="true"
          aria-expanded={view === "months"}
          aria-label={t("selectMonth")}
        >
          {monthLabel}
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 font-medium"
          onClick={() => onViewChange(view === "years" ? "days" : "years")}
          aria-haspopup="true"
          aria-expanded={view === "years"}
          aria-label={t("selectYear")}
        >
          {displayMonth.getFullYear()}
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        </Button>
      </div>
      {view === "days" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={onNextMonth}
          disabled={nextDisabled}
          aria-label={t("nextMonth")}
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      ) : (
        <span className="size-7 shrink-0" aria-hidden="true" />
      )}
    </div>
  );
}

interface MonthGridProps {
  displayMonth: Date;
  fromDate?: Date;
  toDate?: Date;
  locale: string;
  onSelect: (month: number) => void;
}

function MonthGrid({ displayMonth, fromDate, toDate, locale, onSelect }: MonthGridProps) {
  const t = useTranslations("common.datePicker");
  const monthLabels = useMonthLabels(locale, "short");
  const year = displayMonth.getFullYear();
  const selectedRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    selectedRef.current?.focus?.();
  }, []);

  function isDisabled(month: number): boolean {
    if (fromDate && year === fromDate.getFullYear() && month < fromDate.getMonth()) return true;
    if (fromDate && year < fromDate.getFullYear()) return true;
    if (toDate && year === toDate.getFullYear() && month > toDate.getMonth()) return true;
    if (toDate && year > toDate.getFullYear()) return true;
    return false;
  }

  return (
    <div role="grid" aria-label={t("selectMonth")} className="grid grid-cols-3 gap-1.5 p-1">
      {monthLabels.map((label, month) => {
        const isCurrent = month === displayMonth.getMonth();
        return (
          <Button
            key={month}
            ref={isCurrent ? selectedRef : undefined}
            type="button"
            variant={isCurrent ? "default" : "ghost"}
            disabled={isDisabled(month)}
            className="h-11 min-h-11 font-normal"
            onClick={() => onSelect(month)}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}

interface YearGridProps {
  selectedYear: number;
  fromYear: number;
  toYear: number;
  onSelect: (year: number) => void;
}

function YearGrid({ selectedYear, fromYear, toYear, onSelect }: YearGridProps) {
  const t = useTranslations("common.datePicker");
  const currentYear = React.useMemo(() => new Date().getFullYear(), []);
  const years = React.useMemo(
    () => Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i),
    [fromYear, toYear]
  );
  const selectedRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ block: "center" });
    selectedRef.current?.focus?.();
  }, []);

  return (
    <ScrollArea className="h-60">
      <div role="grid" aria-label={t("selectYear")} className="grid grid-cols-4 gap-1.5 p-1 pr-3">
        {years.map((year) => {
          const isSelected = year === selectedYear;
          return (
            <Button
              key={year}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              variant={isSelected ? "default" : year === currentYear ? "secondary" : "ghost"}
              className="h-11 min-h-11 font-normal"
              onClick={() => onSelect(year)}
            >
              {year}
            </Button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function useControllable<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void
): [T, (value: T) => void] {
  const [internal, setInternal] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const resolved = isControlled ? value : internal;
  const set = React.useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );
  return [resolved, set];
}

interface BaseDatePickerProps {
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  className?: string;
  placeholder?: string;
  size?: "default" | "lg" | "xl";
  align?: "start" | "center" | "end";
  fromYear?: number;
  toYear?: number;
  minDate?: Date;
  maxDate?: Date;
  isDateDisabled?: (date: Date) => boolean;
  /** Leading icon shown in the trigger button — defaults to a calendar icon; pass a field-specific icon (e.g. a birthday cake) to match surrounding form context. */
  icon?: React.ReactNode;
}

export interface DatePickerProps extends BaseDatePickerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

/** Single-date picker: fast year/month grid selectors plus the standard day grid, all inside one popover. Value is an ISO "yyyy-MM-dd" string — the single reusable date field for the whole app (see components/ui/date-picker.tsx callers). */
export function DatePicker({
  value,
  defaultValue = "",
  onChange,
  disabled,
  required,
  id,
  name,
  className,
  placeholder,
  size = "default",
  align = "start",
  fromYear = DEFAULT_FROM_YEAR,
  toYear = new Date().getFullYear() + DEFAULT_YEAR_SPAN_AHEAD,
  minDate,
  maxDate,
  isDateDisabled,
  icon,
}: DatePickerProps) {
  const locale = useLocale();
  const t = useTranslations("common.datePicker");
  const [resolvedValue, setResolvedValue] = useControllable(value, defaultValue, onChange);
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<PickerView>("days");
  const selected = parseISODate(resolvedValue);
  const [displayMonth, setDisplayMonth] = React.useState(() => selected ?? new Date());

  function handleOpenChange(next: boolean) {
    if (next) {
      setDisplayMonth(selected ?? new Date());
      setView("days");
    }
    setOpen(next);
  }

  const effectiveFromYear = minDate ? Math.max(fromYear, minDate.getFullYear()) : fromYear;
  const effectiveToYear = maxDate ? Math.min(toYear, maxDate.getFullYear()) : toYear;
  const fromDate = minDate ?? new Date(effectiveFromYear, 0, 1);
  const toDate = maxDate ?? new Date(effectiveToYear, 11, 31);

  function handleDaySelect(date: Date | undefined) {
    if (!date) return;
    setResolvedValue(toISODateString(date));
    setOpen(false);
  }

  function handleMonthSelect(month: number) {
    setDisplayMonth((d) => new Date(d.getFullYear(), month, 1));
    setView("days");
  }

  function handleYearSelect(year: number) {
    setDisplayMonth((d) => new Date(year, d.getMonth(), 1));
    setView("months");
  }

  function shiftMonth(delta: number) {
    setDisplayMonth((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={size}
            id={id}
            disabled={disabled}
            aria-required={required}
            className={cn("w-full min-w-0 justify-start gap-2 font-normal", className)}
          >
            {icon ?? <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />}
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected ? formatDate(selected, locale as SupportedLanguage) : (placeholder ?? t("pickDate"))}
            </span>
          </Button>
        }
      />
      <PopoverContent className="w-auto p-2" align={align} initialFocus={focusInitialCalendarDay}>
        <CalendarNavHeader
          displayMonth={displayMonth}
          view={view}
          onViewChange={setView}
          onPrevMonth={() => shiftMonth(-1)}
          onNextMonth={() => shiftMonth(1)}
          prevDisabled={isSameMonth(displayMonth, fromDate) || displayMonth < fromDate}
          nextDisabled={isSameMonth(displayMonth, toDate) || displayMonth > toDate}
          locale={locale}
        />
        {view === "years" && (
          <YearGrid
            selectedYear={displayMonth.getFullYear()}
            fromYear={effectiveFromYear}
            toYear={effectiveToYear}
            onSelect={handleYearSelect}
          />
        )}
        {view === "months" && (
          <MonthGrid displayMonth={displayMonth} fromDate={fromDate} toDate={toDate} locale={locale} onSelect={handleMonthSelect} />
        )}
        {view === "days" && (
          <Calendar
            mode="single"
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            selected={selected}
            onSelect={handleDaySelect}
            startMonth={fromDate}
            endMonth={toDate}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return isDateDisabled?.(date) ?? false;
            }}
            autoFocus
            className="p-0"
            classNames={{ nav: "hidden", month_caption: "hidden" }}
          />
        )}
      </PopoverContent>
      {name && <input type="hidden" name={name} value={resolvedValue} required={required} />}
    </Popover>
  );
}

export interface DateRangePickerProps extends BaseDatePickerProps {
  value?: { from?: string; to?: string };
  defaultValue?: { from?: string; to?: string };
  onChange?: (value: { from?: string; to?: string }) => void;
}

/** Range variant of {@link DatePicker} sharing the same fast year/month navigation — used by filter panels (e.g. donations date-range filter). */
export function DateRangePicker({
  value,
  defaultValue = {},
  onChange,
  disabled,
  id,
  className,
  placeholder,
  size = "default",
  align = "start",
  fromYear = DEFAULT_FROM_YEAR,
  toYear = new Date().getFullYear() + DEFAULT_YEAR_SPAN_AHEAD,
  minDate,
  maxDate,
  isDateDisabled,
}: DateRangePickerProps) {
  const locale = useLocale();
  const t = useTranslations("common.datePicker");
  const [resolvedValue, setResolvedValue] = useControllable(value, defaultValue, onChange);
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<PickerView>("days");
  const from = parseISODate(resolvedValue.from);
  const to = parseISODate(resolvedValue.to);
  const [displayMonth, setDisplayMonth] = React.useState(() => from ?? new Date());

  function handleOpenChange(next: boolean) {
    if (next) {
      setDisplayMonth(from ?? new Date());
      setView("days");
    }
    setOpen(next);
  }

  const effectiveFromYear = minDate ? Math.max(fromYear, minDate.getFullYear()) : fromYear;
  const effectiveToYear = maxDate ? Math.min(toYear, maxDate.getFullYear()) : toYear;
  const fromDate = minDate ?? new Date(effectiveFromYear, 0, 1);
  const toDate = maxDate ?? new Date(effectiveToYear, 11, 31);

  function handleRangeSelect(range: DateRange | undefined) {
    setResolvedValue({
      from: range?.from ? toISODateString(range.from) : undefined,
      to: range?.to ? toISODateString(range.to) : undefined,
    });
  }

  function handleMonthSelect(month: number) {
    setDisplayMonth((d) => new Date(d.getFullYear(), month, 1));
    setView("days");
  }

  function handleYearSelect(year: number) {
    setDisplayMonth((d) => new Date(year, d.getMonth(), 1));
    setView("months");
  }

  function shiftMonth(delta: number) {
    setDisplayMonth((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  const label = from && to ? `${formatDate(from, locale as SupportedLanguage)} → ${formatDate(to, locale as SupportedLanguage)}` : (placeholder ?? t("pickRange"));

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={size}
            id={id}
            disabled={disabled}
            className={cn("w-full min-w-0 justify-start gap-2 font-normal", className)}
          >
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className={cn("truncate", !(from && to) && "text-muted-foreground")}>{label}</span>
          </Button>
        }
      />
      <PopoverContent className="w-auto p-2" align={align} initialFocus={focusInitialCalendarDay}>
        <CalendarNavHeader
          displayMonth={displayMonth}
          view={view}
          onViewChange={setView}
          onPrevMonth={() => shiftMonth(-1)}
          onNextMonth={() => shiftMonth(1)}
          prevDisabled={isSameMonth(displayMonth, fromDate) || displayMonth < fromDate}
          nextDisabled={isSameMonth(displayMonth, toDate) || displayMonth > toDate}
          locale={locale}
        />
        {view === "years" && (
          <YearGrid
            selectedYear={displayMonth.getFullYear()}
            fromYear={effectiveFromYear}
            toYear={effectiveToYear}
            onSelect={handleYearSelect}
          />
        )}
        {view === "months" && (
          <MonthGrid displayMonth={displayMonth} fromDate={fromDate} toDate={toDate} locale={locale} onSelect={handleMonthSelect} />
        )}
        {view === "days" && (
          <Calendar
            mode="range"
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            selected={{ from, to }}
            onSelect={handleRangeSelect}
            startMonth={fromDate}
            endMonth={toDate}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return isDateDisabled?.(date) ?? false;
            }}
            autoFocus
            className="p-0"
            classNames={{ nav: "hidden", month_caption: "hidden" }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
