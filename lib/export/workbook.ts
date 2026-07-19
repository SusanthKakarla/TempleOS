import ExcelJS from "exceljs";
import type { ColumnDef } from "./types";

/** One ExcelJS workbook shared by both xlsx and csv output — a single column-mapping pass. */
export function buildWorkbook<T>(columns: ColumnDef<T>[], rows: T[], sheetName: string): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.columns = columns.map((col) => ({
    key: col.key,
    header: col.header,
    width: col.width ?? 20,
  }));
  worksheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    const values: Record<string, string | number | null> = {};
    for (const col of columns) {
      values[col.key] = col.accessor(row);
    }
    worksheet.addRow(values);
  }

  return workbook;
}

// Returns Uint8Array, not Buffer — see the comment on ExportFile in ./types.ts
// for why exceljs's own ambient Buffer declaration makes "Buffer" an unsafe
// type name to expose from this module. Buffer.from() here just gives us a
// real Node Buffer instance at runtime (which is a Uint8Array); the encoding
// step (Buffer.from) is unaffected, only the exported static type changes.
export async function workbookToXlsxBuffer(workbook: ExcelJS.Workbook): Promise<Uint8Array> {
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function workbookToCsvBuffer(workbook: ExcelJS.Workbook): Promise<Uint8Array> {
  return Buffer.from(await workbook.csv.writeBuffer());
}
