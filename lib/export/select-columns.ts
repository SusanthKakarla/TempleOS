import type { ColumnDef } from "./types";

/**
 * Filters a module's full ColumnDef list down to the user's selected column
 * ids (from the "Export" modal's column picker), preserving the columns'
 * canonical order rather than the (arbitrary) order ids arrived in — shared
 * by every export route so "export only the selected columns" is one
 * implementation, not one per module.
 *
 * `rawSelection` is `null`/`undefined` for a request with no `columns`
 * param at all (e.g. an old cached client, or a direct API call) — every
 * column is returned unfiltered, matching the export's behavior before
 * column selection existed. An empty selection ([] or "") is NOT the same
 * as "no param" — it means the caller explicitly picked zero columns, and
 * callers should treat that as a validation error (nothing to export)
 * rather than silently falling back to "all".
 */
export function filterSelectedColumns<T>(
  allColumns: ColumnDef<T>[],
  rawSelection: string[] | string | null | undefined,
): ColumnDef<T>[] {
  if (rawSelection === null || rawSelection === undefined) return allColumns;
  const selectedIds = new Set(
    Array.isArray(rawSelection)
      ? rawSelection
      : rawSelection
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
  );
  return allColumns.filter((column) => selectedIds.has(column.key));
}
