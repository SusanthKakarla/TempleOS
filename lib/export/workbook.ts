import ExcelJS from "exceljs";
import type { ColumnDef } from "./types";

const DATE_NUMFMT = "dd-mmm-yyyy";
const CURRENCY_NUMFMT = '"₹"#,##0.00';

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
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of rows) {
    const values: Record<string, string | number | Date | null> = {};
    for (const col of columns) {
      values[col.key] = col.accessor(row);
    }
    const addedRow = worksheet.addRow(values);
    // Applying numFmt per-cell (not per-column) so a "—" placeholder string
    // for a null date/amount stays plain text instead of being coerced into
    // the date/currency format.
    columns.forEach((col, index) => {
      if (!col.format) return;
      const cell = addedRow.getCell(index + 1);
      if (col.format === "date" && cell.value instanceof Date) {
        cell.numFmt = DATE_NUMFMT;
      } else if (col.format === "currency" && typeof cell.value === "number") {
        cell.numFmt = CURRENCY_NUMFMT;
      }
    });
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
