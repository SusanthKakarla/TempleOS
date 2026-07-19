/**
 * A generic column definition shared by every export format (xlsx/csv/pdf)
 * and the devotee import template — one accessor per column, no per-format
 * duplication.
 */
export interface ColumnDef<T> {
  key: string;
  header: string;
  accessor: (row: T) => string | number | null;
  /** Column width hint (character units for xlsx, proportional weight for pdf). */
  width?: number;
}

export interface ExportMeta {
  title: string; // module name, e.g. "Devotees"
  tenantName: string;
  generatedBy: string;
  generatedAt: Date;
}

export type ExportFormat = "xlsx" | "csv" | "pdf";

export interface ExportFile {
  // Uint8Array, not Buffer: exceljs's own .d.ts declares an ambient global
  // `Buffer` shadow (`extends ArrayBuffer`) that merges into and pollutes
  // the real Node Buffer type project-wide once exceljs's types are loaded
  // — Uint8Array is unambiguous and still valid BodyInit for NextResponse.
  buffer: Uint8Array;
  contentType: string;
  filename: string;
}
