"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, FileSpreadsheet, FileText, Sheet } from "lucide-react";
import type { ExportFormat } from "@/lib/export/types";
import { downloadFromResponse } from "@/lib/export/download-client";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Scope = "all" | "filtered" | "selected";
type ModuleLabelKey = "events" | "devotees" | "donations" | "conversations" | "users";

interface ExportMenuProps {
  /** Base export API path, e.g. "/api/devotees/export". */
  exportUrl: string;
  /** Current table search/filter params — enables the "Filtered" scope when non-empty. */
  filterParams?: URLSearchParams;
  /** Currently-selected row IDs — enables the "Selected" scope when non-empty. */
  selectedIds?: string[];
  /** Also used as the exported filename's base — always the English word regardless of locale. */
  moduleLabel: ModuleLabelKey;
}

const FORMATS: { value: ExportFormat; labelKey: "excel" | "csv" | "pdf"; icon: typeof FileSpreadsheet }[] = [
  { value: "xlsx", labelKey: "excel", icon: FileSpreadsheet },
  { value: "csv", labelKey: "csv", icon: Sheet },
  { value: "pdf", labelKey: "pdf", icon: FileText },
];

export function ExportMenu({ exportUrl, filterParams, selectedIds = [], moduleLabel }: ExportMenuProps) {
  const t = useTranslations("export");
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>("all");
  const [pendingFormat, setPendingFormat] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = Boolean(filterParams && Array.from(filterParams.keys()).length > 0);
  const hasSelection = selectedIds.length > 0;

  async function handleExport(format: ExportFormat) {
    setError(null);
    setPendingFormat(format);
    try {
      if (scope === "selected") {
        const response = await fetch(exportUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format, ids: selectedIds }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Export failed");
        }
        await downloadFromResponse(response, `${moduleLabel}.${format}`);
      } else {
        const params = new URLSearchParams(scope === "filtered" ? filterParams : undefined);
        params.set("format", format);
        window.location.assign(`${exportUrl}?${params.toString()}`);
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setPendingFormat(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setScope(hasSelection ? "selected" : "all");
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-1.5">
            <Download className="size-4" />
            {t("exportButton")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle", { module: t(`moduleLabels.${moduleLabel}`) })}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              {t("tabs.all")}
            </TabsTrigger>
            {hasFilters && (
              <TabsTrigger value="filtered" className="flex-1">
                {t("tabs.filtered")}
              </TabsTrigger>
            )}
            {hasSelection && (
              <TabsTrigger value="selected" className="flex-1">
                {t("tabs.selected", { count: selectedIds.length })}
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {FORMATS.map(({ value, labelKey, icon: Icon }) => (
            <Button
              key={value}
              variant="outline"
              className="flex h-auto flex-col gap-1.5 py-3"
              disabled={pendingFormat !== null}
              onClick={() => handleExport(value)}
            >
              <Icon className="size-5 text-saffron" />
              <span className="text-xs">{pendingFormat === value ? t("preparing") : t(`formats.${labelKey}`)}</span>
            </Button>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
