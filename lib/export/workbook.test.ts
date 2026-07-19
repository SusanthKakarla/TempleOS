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
