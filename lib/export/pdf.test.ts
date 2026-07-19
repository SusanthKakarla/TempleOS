import { describe, expect, it } from "vitest";
import { buildPdfBuffer } from "./pdf";
import type { ColumnDef, ExportMeta } from "./types";

interface Row {
  name: string;
}

const columns: ColumnDef<Row>[] = [{ key: "name", header: "Name", accessor: (r) => r.name }];
const meta: ExportMeta = {
  title: "Devotees",
  tenantName: "Sri Venkateswara Temple",
  generatedBy: "Admin",
  generatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("buildPdfBuffer", () => {
  it("produces a non-empty, valid PDF buffer", async () => {
    const buffer = await buildPdfBuffer(columns, [{ name: "Ravi Kumar" }], meta);
    expect(buffer.length).toBeGreaterThan(0);
    expect(Buffer.from(buffer.subarray(0, 5)).toString("ascii")).toBe("%PDF-");
  });

  it("handles an empty row set without throwing", async () => {
    const buffer = await buildPdfBuffer(columns, [], meta);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("paginates across many rows without throwing", async () => {
    const manyRows = Array.from({ length: 200 }, (_, i) => ({ name: `Devotee ${i}` }));
    const buffer = await buildPdfBuffer(columns, manyRows, meta);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
