"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Search, User, UserPlus, X } from "lucide-react";
import type { Devotee, Gender } from "@/types/db";
import { GENDER_OPTIONS } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { normalizePhoneNumber } from "@/lib/phone.mts";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export interface NewDevoteeDraft {
  displayName: string;
  whatsappPhone: string;
  gender: Gender | "";
  dateOfBirth: string;
}

export type DonorSelection =
  | { kind: "existing"; devotee: Devotee }
  | { kind: "new"; draft: NewDevoteeDraft }
  | { kind: "none" };

function looksNumeric(value: string): boolean {
  return /\d/.test(value) && value.replace(/[^a-zA-Z]/g, "").length === 0;
}

interface DonorPickerProps {
  /** Pre-selects a devotee and locks the picker — used from a devotee's own detail page. */
  fixedDevoteeId?: string;
  /** Only used to resolve fixedDevoteeId's display label; live search always goes through the API, never this list. */
  devotees: Devotee[];
  value: DonorSelection;
  onChange: (value: DonorSelection) => void;
}

/**
 * Single smart donor field replacing the old Existing-Devotee/Manual-Donor
 * toggle: temple staff type a name or phone, pick a match if one exists, or
 * create a new devotee inline (with just Name + Mobile) if it doesn't —
 * they never have to decide up front which case they're in. Reuses the same
 * search API (`GET /api/devotees?search=`) the Family Member search already
 * uses (features/devotees/devotee-form-dialog.tsx) — no duplicate search
 * endpoint or matching logic.
 */
export function DonorPicker({ fixedDevoteeId, devotees, value, onChange }: DonorPickerProps) {
  const t = useTranslations("donations.formDialog.donorPicker");
  const tGender = useTranslations("devotees.formDialog");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Devotee[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showAdditional, setShowAdditional] = useState(false);
  const [dismissedDuplicateId, setDismissedDuplicateId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const searchKey = value.kind === "new" ? value.draft.whatsappPhone || value.draft.displayName : query;

  useEffect(() => {
    if (fixedDevoteeId) return;
    const trimmed = searchKey.trim();
    debounceRef.current = setTimeout(async () => {
      if (trimmed.length < MIN_QUERY_LENGTH) {
        setResults([]);
        setSearched(false);
        return;
      }
      setSearching(true);
      try {
        const response = await fetch(`/api/devotees?search=${encodeURIComponent(trimmed)}`);
        const body = (await response.json().catch(() => ({}))) as { devotees?: Devotee[] };
        setResults(body.devotees ?? []);
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [searchKey, fixedDevoteeId]);

  if (fixedDevoteeId) {
    const fixedDevotee = devotees.find((d) => d.id === fixedDevoteeId);
    return (
      <Input
        value={[fixedDevotee?.displayName, fixedDevotee?.whatsappPhone].filter(Boolean).join(" · ")}
        disabled
        inputSize="lg"
        className="bg-muted/50"
        aria-label={t("label")}
      />
    );
  }

  function selectExisting(devotee: Devotee) {
    onChange({ kind: "existing", devotee });
    setQuery("");
    setResults([]);
  }

  function clearSelection() {
    onChange({ kind: "none" });
    setQuery("");
    setResults([]);
    setShowAdditional(false);
  }

  function startCreatingNew() {
    const trimmed = query.trim();
    onChange({
      kind: "new",
      draft: {
        displayName: looksNumeric(trimmed) ? "" : trimmed,
        whatsappPhone: looksNumeric(trimmed) ? trimmed : "",
        gender: "",
        dateOfBirth: "",
      },
    });
  }

  function updateDraft(patch: Partial<NewDevoteeDraft>) {
    if (value.kind !== "new") return;
    onChange({ kind: "new", draft: { ...value.draft, ...patch } });
  }

  // Existing devotee selected — show a locked summary card with a way to change it.
  if (value.kind === "existing") {
    const devotee = value.devotee;
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <User className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{devotee.displayName}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {[devotee.familyName, devotee.whatsappPhone ?? t("noPhone")].filter(Boolean).join(" · ")}
            </span>
          </span>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
          {t("change")}
        </Button>
      </div>
    );
  }

  // No match — creating a new devotee inline.
  if (value.kind === "new") {
    const normalizedDraftPhone = normalizePhoneNumber(value.draft.whatsappPhone);
    const foundDuplicate = normalizedDraftPhone
      ? results.find((d) => d.whatsappPhone && normalizePhoneNumber(d.whatsappPhone) === normalizedDraftPhone)
      : undefined;
    const duplicateMatch = foundDuplicate && foundDuplicate.id !== dismissedDuplicateId ? foundDuplicate : undefined;

    return (
      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            <UserPlus className="size-4" />
            {t("creatingNewDevotee")}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
            <X className="size-3.5" />
            {t("cancel")}
          </Button>
        </div>

        {duplicateMatch && (
          <div className="space-y-2 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm dark:border-amber-600 dark:bg-amber-950/40">
            <p className="font-medium text-amber-900 dark:text-amber-200">{t("duplicateFoundTitle")}</p>
            <p className="text-amber-800 dark:text-amber-300">
              {duplicateMatch.displayName} · {duplicateMatch.whatsappPhone}
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => selectExisting(duplicateMatch)}>
                {t("useExisting")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-amber-400 dark:border-amber-600"
                onClick={() => setDismissedDuplicateId(duplicateMatch.id)}
              >
                {t("createAnyway")}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="new-devotee-name" className="justify-between">
            <span>{t("nameLabel")}</span>
            <span className="text-xs font-normal text-muted-foreground">{t("required")}</span>
          </Label>
          <Input
            id="new-devotee-name"
            value={value.draft.displayName}
            onChange={(e) => updateDraft({ displayName: e.target.value })}
            inputSize="lg"
            placeholder={t("namePlaceholder")}
            autoFocus={value.draft.displayName === ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-devotee-phone" className="justify-between">
            <span>{t("phoneLabel")}</span>
            <span className="text-xs font-normal text-muted-foreground">{t("required")}</span>
          </Label>
          <Input
            id="new-devotee-phone"
            value={value.draft.whatsappPhone}
            onChange={(e) => updateDraft({ whatsappPhone: e.target.value })}
            inputSize="lg"
            placeholder={t("phonePlaceholder")}
          />
        </div>

        <Collapsible open={showAdditional} onOpenChange={setShowAdditional}>
          <CollapsibleTrigger className="flex min-h-9 w-full items-center justify-between gap-2 text-left text-sm text-muted-foreground hover:text-foreground">
            <span>{t("additionalInformation")}</span>
            <ChevronDown className={cn("size-4 shrink-0 transition-transform", showAdditional && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-devotee-gender">{tGender("fields.gender")}</Label>
                <Select
                  value={value.draft.gender}
                  onValueChange={(v) => updateDraft({ gender: (v as Gender) ?? "" })}
                  items={Object.fromEntries(GENDER_OPTIONS.map((g) => [g, tGender(`genderOptions.${g}`)]))}
                >
                  <SelectTrigger id="new-devotee-gender" size="lg" className="w-full">
                    <SelectValue placeholder={tGender("fields.genderPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {tGender(`genderOptions.${g}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-devotee-dob">{tGender("fields.dateOfBirth")}</Label>
                <DatePicker
                  id="new-devotee-dob"
                  value={value.draft.dateOfBirth}
                  onChange={(v) => updateDraft({ dateOfBirth: v })}
                  maxDate={new Date()}
                  size="lg"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  // Nothing selected yet — live search box.
  const trimmedQuery = query.trim();
  return (
    <div className="space-y-2">
      <div className="relative z-20">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="donor-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          inputSize="lg"
          className="pl-9"
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
        />
        {trimmedQuery.length >= MIN_QUERY_LENGTH && (
          <div className="absolute top-full left-0 z-30 mt-1 max-h-64 w-full origin-top overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-150 animate-in fade-in-0 zoom-in-95 slide-in-from-top-1">
            {searching ? (
              <p className="px-2 py-2 text-sm text-muted-foreground">{t("searching")}</p>
            ) : results.length > 0 ? (
              results.map((devotee) => (
                <button
                  key={devotee.id}
                  type="button"
                  onClick={() => selectExisting(devotee)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                >
                  <User className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{devotee.displayName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[devotee.familyName, devotee.whatsappPhone ?? t("noPhone")].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              ))
            ) : searched ? (
              <div className="space-y-1.5 p-2">
                <p className="text-sm text-muted-foreground">{t("noResults")}</p>
                <Button type="button" size="sm" className="w-full gap-1.5" onClick={startCreatingNew}>
                  <UserPlus className="size-4" />
                  {t("createNew")}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
