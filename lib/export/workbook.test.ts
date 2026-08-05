import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildWorkbook, workbookToCsvBuffer, workbookToXlsxBuffer } from "./workbook";
import type { ColumnDef } from "./types";

interface Row {
  name: string;
  amount: number;
}

const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "amount", header: "Amount", accessor: (r) => r.amount },
];
const rows: Row[] = [
  { name: "Ravi Kumar", amount: 500 },
  { name: "Lakshmi Devi", amount: 1200 },
];

describe("buildWorkbook + workbookToXlsxBuffer", () => {
  it("round-trips through a real xlsx buffer with header row and values intact", async () => {
    const workbook = buildWorkbook(columns, rows, "Devotees");
    const buffer = await workbookToXlsxBuffer(workbook);
    expect(buffer.length).toBeGreaterThan(0);

    const reloaded = new ExcelJS.Workbook();
    // exceljs's own .d.ts declares a shadow `Buffer` type that clashes with
    // modern @types/node's `Buffer` (see the comment in workbook.ts) —
    // harmless at runtime, this is round-tripping exceljs's own output.
    await reloaded.xlsx.load(buffer as never);
    const sheet = reloaded.getWorksheet("Devotees")!;
    expect(sheet.getRow(1).getCell(1).value).toBe("Name");
    expect(sheet.getRow(1).getCell(2).value).toBe("Amount");
    expect(sheet.getRow(2).getCell(1).value).toBe("Ravi Kumar");
    expect(sheet.getRow(2).getCell(2).value).toBe(500);
    expect(sheet.getRow(3).getCell(1).value).toBe("Lakshmi Devi");
  });

  it("truncates the sheet name to Excel's 31-char limit upstream (buildExportFile), not here", () => {
    // buildWorkbook itself trusts the caller's sheetName — the 31-char cap
    // is enforced in lib/export/index.ts's buildExportFile, tested there.
    expect(() => buildWorkbook(columns, [], "Devotees")).not.toThrow();
  });

  it("bolds the header row and freezes it (worksheet.views ySplit: 1) so it stays visible while scrolling a large export", () => {
    const workbook = buildWorkbook(columns, rows, "Devotees");
    const sheet = workbook.getWorksheet("Devotees")!;
    expect(sheet.getRow(1).font).toEqual({ bold: true });
    expect(sheet.views).toEqual([{ state: "frozen", ySplit: 1 }]);
  });

  it("applies a date numFmt to Date-valued cells in columns tagged format: \"date\" — preserving them as real Excel dates, not text", async () => {
    interface DateRow {
      donatedAt: Date;
    }
    const dateColumns: ColumnDef<DateRow>[] = [
      { key: "donatedAt", header: "Donated At", accessor: (r) => r.donatedAt, format: "date" },
    ];
    const workbook = buildWorkbook(dateColumns, [{ donatedAt: new Date("2026-08-05T00:00:00.000Z") }], "Donations");
    const buffer = await workbookToXlsxBuffer(workbook);

    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(buffer as never);
    const sheet = reloaded.getWorksheet("Donations")!;
    const cell = sheet.getRow(2).getCell(1);
    expect(cell.value).toBeInstanceOf(Date);
    expect(cell.numFmt).toBe("dd-mmm-yyyy");
  });

  it("applies a currency numFmt to number-valued cells in columns tagged format: \"currency\"", async () => {
    interface AmountRow {
      amount: number;
    }
    const amountColumns: ColumnDef<AmountRow>[] = [
      { key: "amount", header: "Amount", accessor: (r) => r.amount, format: "currency" },
    ];
    const workbook = buildWorkbook(amountColumns, [{ amount: 501 }], "Donations");
    const buffer = await workbookToXlsxBuffer(workbook);

    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(buffer as never);
    const sheet = reloaded.getWorksheet("Donations")!;
    const cell = sheet.getRow(2).getCell(1);
    expect(cell.value).toBe(501);
    expect(cell.numFmt).toBe('"₹"#,##0.00');
  });

  it("does not apply a numFmt to a placeholder string (e.g. \"—\" for a null date) even when the column is tagged format: \"date\"", async () => {
    interface DateRow {
      donatedAt: Date | string;
    }
    const dateColumns: ColumnDef<DateRow>[] = [
      { key: "donatedAt", header: "Donated At", accessor: (r) => r.donatedAt, format: "date" },
    ];
    const workbook = buildWorkbook(dateColumns, [{ donatedAt: "—" }], "Donations");
    const sheet = workbook.getWorksheet("Donations")!;
    const cell = sheet.getRow(2).getCell(1);
    expect(cell.value).toBe("—");
    expect(cell.numFmt).toBeUndefined();
  });
});

describe("workbookToCsvBuffer", () => {
  it("produces a CSV buffer with header and comma-separated values", async () => {
    const workbook = buildWorkbook(columns, rows, "Devotees");
    const buffer = await workbookToCsvBuffer(workbook);
    const text = Buffer.from(buffer).toString("utf-8");
    expect(text).toContain("Name,Amount");
    expect(text).toContain("Ravi Kumar,500");
  });
});
