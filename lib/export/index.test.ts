import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildExportFile } from "./index";
import type { ColumnDef, ExportMeta } from "./types";

interface Row {
  name: string;
}

const columns: ColumnDef<Row>[] = [{ key: "name", header: "Name", accessor: (r) => r.name }];
const meta: ExportMeta = {
  title: "A Very Long Module Name That Exceeds Excel's Sheet Name Limit",
  tenantName: "Sri Venkateswara Temple",
  generatedBy: "Admin",
  generatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("buildExportFile", () => {
  it("produces a correctly content-typed xlsx file with a truncated sheet name", async () => {
    const file = await buildExportFile("xlsx", columns, [{ name: "Ravi Kumar" }], meta);
    expect(file.contentType).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(file.filename).toMatch(/^a-very-long-module-name.*\.xlsx$/);

    const workbook = new ExcelJS.Workbook();
    // See workbook.test.ts — exceljs's shadow Buffer type vs @types/node's Buffer.
    await workbook.xlsx.load(file.buffer as never);
    expect(workbook.worksheets[0].name.length).toBeLessThanOrEqual(31);
  });

  it("produces a correctly content-typed csv file", async () => {
    const file = await buildExportFile("csv", columns, [{ name: "Ravi Kumar" }], meta);
    expect(file.contentType).toBe("text/csv");
    expect(file.filename).toMatch(/\.csv$/);
  });

  it("produces a correctly content-typed pdf file", async () => {
    const file = await buildExportFile("pdf", columns, [{ name: "Ravi Kumar" }], meta);
    expect(file.contentType).toBe("application/pdf");
    expect(file.filename).toMatch(/\.pdf$/);
    expect(Buffer.from(file.buffer.subarray(0, 5)).toString("ascii")).toBe("%PDF-");
  });
});
