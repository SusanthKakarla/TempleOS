import { describe, expect, it } from "vitest";
import type { ColumnDef } from "./types";
import { filterSelectedColumns } from "./select-columns";

const ALL_COLUMNS: ColumnDef<{ a: string; b: string; c: string }>[] = [
  { key: "a", header: "A", accessor: (r) => r.a },
  { key: "b", header: "B", accessor: (r) => r.b },
  { key: "c", header: "C", accessor: (r) => r.c },
];

describe("filterSelectedColumns", () => {
  it("returns every column unchanged when the selection is null (no `columns` param at all — pre-column-selection behavior)", () => {
    expect(filterSelectedColumns(ALL_COLUMNS, null)).toEqual(ALL_COLUMNS);
  });

  it("returns every column unchanged when the selection is undefined", () => {
    expect(filterSelectedColumns(ALL_COLUMNS, undefined)).toEqual(ALL_COLUMNS);
  });

  it("filters to only the selected column keys, from a comma-separated string (GET ?columns=)", () => {
    const result = filterSelectedColumns(ALL_COLUMNS, "a,c");
    expect(result.map((c) => c.key)).toEqual(["a", "c"]);
  });

  it("filters to only the selected column keys, from an array (POST body columns[])", () => {
    const result = filterSelectedColumns(ALL_COLUMNS, ["b"]);
    expect(result.map((c) => c.key)).toEqual(["b"]);
  });

  it("preserves the canonical column order regardless of the selection's order", () => {
    const result = filterSelectedColumns(ALL_COLUMNS, "c,a");
    expect(result.map((c) => c.key)).toEqual(["a", "c"]);
  });

  it("returns an empty array for an empty-string selection — the caller must treat this as a validation error, not fall back to 'all'", () => {
    expect(filterSelectedColumns(ALL_COLUMNS, "")).toEqual([]);
  });

  it("returns an empty array for an empty-array selection", () => {
    expect(filterSelectedColumns(ALL_COLUMNS, [])).toEqual([]);
  });

  it("ignores unknown column keys in the selection instead of throwing", () => {
    const result = filterSelectedColumns(ALL_COLUMNS, "a,not-a-real-column,b");
    expect(result.map((c) => c.key)).toEqual(["a", "b"]);
  });

  it("tolerates whitespace around comma-separated keys", () => {
    const result = filterSelectedColumns(ALL_COLUMNS, " a , b ");
    expect(result.map((c) => c.key)).toEqual(["a", "b"]);
  });
});
