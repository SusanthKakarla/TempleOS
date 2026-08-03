"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-picker";
import { mergeSearchParam } from "@/lib/url-params";
import { DONATION_PURPOSE_PRESETS } from "@/features/donations/donation-options";

export function DashboardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tCommon = useTranslations("common");
  const tDonations = useTranslations("donations");

  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;
  const purpose = searchParams.get("purpose") ?? "all";
  const hasActiveFilters = Boolean(dateFrom || dateTo || purpose !== "all");

  function apply(next: { dateFrom?: string; dateTo?: string; purpose: string }) {
    let params: URLSearchParams = new URLSearchParams(searchParams);
    params = mergeSearchParam(params, "dateFrom", next.dateFrom ?? null);
    params = mergeSearchParam(params, "dateTo", next.dateTo ?? null);
    params = mergeSearchParam(params, "purpose", next.purpose === "all" ? null : next.purpose);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const purposeItems: Record<string, string> = {
    all: tDonations("filters.allPurposes"),
    ...Object.fromEntries(DONATION_PURPOSE_PRESETS.map((preset) => [preset, preset])),
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DateRangePicker
        value={{ from: dateFrom, to: dateTo }}
        onChange={(range) => apply({ dateFrom: range.from, dateTo: range.to, purpose })}
        placeholder={tCommon("datePicker.pickRange")}
        className="w-auto"
      />
      <Select
        value={purpose}
        onValueChange={(v) => apply({ dateFrom, dateTo, purpose: v ?? "all" })}
        items={purposeItems}
      >
        <SelectTrigger className="w-auto min-w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(purposeItems).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => apply({ purpose: "all" })}>
          <X className="size-3.5" />
          {tCommon("clearFilters")}
        </Button>
      )}
    </div>
  );
}
