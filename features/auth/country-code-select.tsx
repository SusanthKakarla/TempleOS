"use client";

import { useMemo, useState } from "react";
import type { CountryCode } from "libphonenumber-js";
import { ChevronDown, Search } from "lucide-react";
import * as Flags from "country-flag-icons/react/3x2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { COUNTRIES, getCountry } from "@/lib/countries";
import { cn } from "@/lib/utils";

/** Real SVG flags render consistently everywhere — Windows in particular shows plain
 * "GB"/"SG" letters instead of a flag glyph for the Unicode regional-indicator emoji
 * technique, so an actual icon set is used instead of an emoji character. */
function FlagIcon({ iso, className }: { iso: CountryCode; className?: string }) {
  const Flag = Flags[iso as keyof typeof Flags];
  if (!Flag) return <span className={cn("inline-block rounded-sm bg-muted", className)} />;
  return <Flag title="" className={cn("inline-block rounded-sm", className)} />;
}

export function CountryCodeSelect({
  value,
  onChange,
}: {
  value: CountryCode;
  onChange: (iso: CountryCode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = getCountry(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (country) => country.name.toLowerCase().includes(q) || country.dialCode.includes(q),
    );
  }, [query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="h-8 shrink-0 gap-1.5 px-2.5"
            aria-label={`Country: ${selected.name}, dial code +${selected.dialCode}`}
          >
            <FlagIcon iso={selected.iso} className="h-3.5 w-5" />
            <span className="text-sm">+{selected.dialCode}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent className="w-72 p-0" align="start">
        <div className="relative border-b p-2">
          <Search className="pointer-events-none absolute top-1/2 left-4.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search country or code..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <ScrollArea className="h-72">
          <div className="p-1.5">
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">No countries found</p>
            ) : (
              filtered.map((country) => (
                <button
                  key={country.iso}
                  type="button"
                  onClick={() => {
                    onChange(country.iso);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent",
                    country.iso === value && "bg-accent",
                  )}
                >
                  <FlagIcon iso={country.iso} className="h-3.5 w-5 shrink-0" />
                  <span className="flex-1 truncate">{country.name}</span>
                  <span className="text-muted-foreground">+{country.dialCode}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
