import { buildWorkbook, workbookToCsvBuffer, workbookToXlsxBuffer } from "./workbook";
import { buildPdfBuffer } from "./pdf";
import type { ColumnDef, ExportFile, ExportFormat, ExportMeta } from "./types";

const CONTENT_TYPES: Record<ExportFormat, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  pdf: "application/pdf",
};

/** yyyy-mm-dd, safe for filenames, in the server's local date (matches meta.generatedAt). */
function dateSuffix(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function buildExportFile<T>(
  format: ExportFormat,
  columns: ColumnDef<T>[],
  rows: T[],
  meta: ExportMeta,
): Promise<ExportFile> {
  const slug = meta.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const filename = `${slug}-${dateSuffix(meta.generatedAt)}.${format}`;

  if (format === "pdf") {
    return { buffer: await buildPdfBuffer(columns, rows, meta), contentType: CONTENT_TYPES.pdf, filename };
  }

  const workbook = buildWorkbook(columns, rows, meta.title.slice(0, 31)); // xlsx sheet names cap at 31 chars
  const buffer = format === "xlsx" ? await workbookToXlsxBuffer(workbook) : await workbookToCsvBuffer(workbook);
  return { buffer, contentType: CONTENT_TYPES[format], filename };
}

export type { ColumnDef, ExportFile, ExportFormat, ExportMeta };
