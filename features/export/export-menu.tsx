"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, FileSpreadsheet, FileText, Sheet } from "lucide-react";
import type { ExportFormat } from "@/lib/export/types";
import type { ExportColumnCatalogEntry } from "@/lib/export/columns/devotees-catalog";
import { downloadFromResponse } from "@/lib/export/download-client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
type ModuleLabelKey = "events" | "devotees" | "donations" | "conversations" | "users" | "campaigns";

interface ExportMenuProps {
  /** Base export API path, e.g. "/api/devotees/export". */
  exportUrl: string;
  /** Current table search/filter params — enables the "Filtered" scope when non-empty. */
  filterParams?: URLSearchParams;
  /** Currently-selected row IDs — enables the "Selected" scope when non-empty. */
  selectedIds?: string[];
  /** Also used as the exported filename's base — always the English word regardless of locale. */
  moduleLabel: ModuleLabelKey;
  /**
   * The module's available export columns — id must match the ColumnDef.key
   * the backend's column builder uses (see lib/export/columns/*-catalog.ts),
   * labelKey resolves under the `exportLabels.{moduleLabel}` i18n namespace.
   * Omit to skip the column picker entirely (exports every column, the old
   * behavior) — every current caller passes one of the two catalogs.
   */
  columns?: ExportColumnCatalogEntry[];
  /** Row count matching the current filters — shown as "N records will be exported" for the All/Filtered scopes. Ignored for the Selected scope, which uses selectedIds.length instead. */
  recordCount?: number;
  /** Controlled open state — lets a page open this dialog from its own trigger (e.g. a page-level overflow menu item) instead of the built-in button. Omit for the default self-managed behavior. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Suppresses the built-in "Export" button, for callers that provide `open`/`onOpenChange` and their own trigger elsewhere. */
  hideTrigger?: boolean;
}

const FORMATS: { value: ExportFormat; labelKey: "excel" | "csv" | "pdf"; icon: typeof FileSpreadsheet }[] = [
  { value: "xlsx", labelKey: "excel", icon: FileSpreadsheet },
  { value: "csv", labelKey: "csv", icon: Sheet },
  { value: "pdf", labelKey: "pdf", icon: FileText },
];

function columnsStorageKey(moduleLabel: ModuleLabelKey): string {
  return `templeos:export-columns:${moduleLabel}`;
}

/** Reads the last-used column selection for this module from localStorage, discarding any ids that no longer exist in the current catalog (a column was renamed/removed since the user last exported). Falls back to "every column" — the same default the export always had before column selection existed. */
function loadStoredColumns(moduleLabel: ModuleLabelKey, allIds: string[]): string[] {
  if (typeof window === "undefined") return allIds;
  try {
    const raw = window.localStorage.getItem(columnsStorageKey(moduleLabel));
    if (!raw) return allIds;
    const stored = JSON.parse(raw) as unknown;
    if (!Array.isArray(stored)) return allIds;
    const validIds = new Set(allIds);
    const filtered = stored.filter((id): id is string => typeof id === "string" && validIds.has(id));
    return filtered.length > 0 ? filtered : allIds;
  } catch {
    return allIds;
  }
}

export function ExportMenu({
  exportUrl,
  filterParams,
  selectedIds = [],
  moduleLabel,
  columns,
  recordCount = 0,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: ExportMenuProps) {
  const t = useTranslations("export");
  const tColumnLabels = useTranslations(`exportLabels.${moduleLabel}`);
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  const [scope, setScope] = useState<Scope>("all");
  const [pendingFormat, setPendingFormat] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allColumnIds = useMemo(() => (columns ?? []).map((c) => c.id), [columns]);
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>(allColumnIds);

  const hasFilters = Boolean(filterParams && Array.from(filterParams.keys()).length > 0);
  const hasSelection = selectedIds.length > 0;
  const noColumnsSelected = columns !== undefined && selectedColumnIds.length === 0;
  const displayedRecordCount = scope === "selected" ? selectedIds.length : recordCount;

  function toggleColumn(id: string, checked: boolean) {
    setSelectedColumnIds((prev) => {
      const next = checked ? [...prev, id] : prev.filter((existing) => existing !== id);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(columnsStorageKey(moduleLabel), JSON.stringify(next));
      }
      return next;
    });
  }

  function setAllColumns(checked: boolean) {
    const next = checked ? allColumnIds : [];
    setSelectedColumnIds(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(columnsStorageKey(moduleLabel), JSON.stringify(next));
    }
  }

  async function handleExport(format: ExportFormat) {
    if (noColumnsSelected) return;
    setError(null);
    setPendingFormat(format);
    try {
      const columnsParam = columns ? selectedColumnIds.join(",") : undefined;
      if (scope === "selected") {
        const response = await fetch(exportUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format, ids: selectedIds, ...(columnsParam ? { columns: selectedColumnIds } : {}) }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Export failed");
        }
        await downloadFromResponse(response, `${moduleLabel}.${format}`);
      } else {
        const params = new URLSearchParams(scope === "filtered" ? filterParams : undefined);
        params.set("format", format);
        if (columnsParam) params.set("columns", columnsParam);
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
          if (columns) setSelectedColumnIds(loadStoredColumns(moduleLabel, allColumnIds));
        }
      }}
    >
      {!hideTrigger && (
        <DialogTrigger
          render={
            <Button variant="outline" className="gap-1.5">
              <Download className="size-4" />
              {t("exportButton")}
            </Button>
          }
        />
      )}
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle", { module: t(`moduleLabels.${moduleLabel}`) })}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
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

          {columns && columns.length > 0 && (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t("columns.sectionTitle")}</span>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                  <Checkbox
                    checked={selectedColumnIds.length === allColumnIds.length}
                    indeterminate={selectedColumnIds.length > 0 && selectedColumnIds.length < allColumnIds.length}
                    onCheckedChange={(checked) => setAllColumns(checked === true)}
                    aria-label={t("columns.selectAll")}
                  />
                  {selectedColumnIds.length === allColumnIds.length ? t("columns.clearAll") : t("columns.selectAll")}
                </label>
              </div>
              <p className="text-xs text-muted-foreground">{t("columns.description")}</p>
              <div className="grid max-h-48 grid-cols-2 gap-x-3 gap-y-1.5 overflow-y-auto rounded-md border bg-muted/30 p-2">
                {columns.map((column) => (
                  <label key={column.id} className="flex cursor-pointer items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={selectedColumnIds.includes(column.id)}
                      onCheckedChange={(checked) => toggleColumn(column.id, checked === true)}
                    />
                    <span className="truncate">{tColumnLabels(column.labelKey)}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("columns.columnsSelected", { count: selectedColumnIds.length })}</span>
                <span>{t("columns.recordsToExport", { count: displayedRecordCount })}</span>
              </div>
              {noColumnsSelected && <p className="text-xs text-destructive">{t("columns.selectAtLeastOne")}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {FORMATS.map(({ value, labelKey, icon: Icon }) => (
              <Button
                key={value}
                variant="outline"
                className="flex h-auto flex-col gap-1.5 py-3"
                disabled={pendingFormat !== null || noColumnsSelected}
                onClick={() => handleExport(value)}
              >
                <Icon className="size-5 text-saffron" />
                <span className="text-xs">{pendingFormat === value ? t("preparing") : t(`formats.${labelKey}`)}</span>
              </Button>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
