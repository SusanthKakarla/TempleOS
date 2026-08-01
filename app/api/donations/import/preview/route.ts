import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { validateImportRow, type PreviewRow, type RawImportRow } from "@/lib/validation/donation-import";

const MAX_ROWS = 2000;

const HEADER_ALIASES: Record<string, keyof RawImportRow> = {
  "donor name": "donorName",
  name: "donorName",
  "donor phone": "donorPhone",
  "donor phone (optional — links to an existing devotee if it matches)": "donorPhone",
  phone: "donorPhone",
  "donor email": "donorEmail",
  "donor email (optional)": "donorEmail",
  email: "donorEmail",
  amount: "amount",
  "amount (inr)": "amount",
  purpose: "purpose",
  "payment method": "paymentMethod",
  "payment method (cash, upi, bank_transfer, cheque, other)": "paymentMethod",
  "payment method (cash/upi/bank_transfer/cheque/other)": "paymentMethod",
  method: "paymentMethod",
  date: "donatedAt",
  "date (yyyy-mm-dd)": "donatedAt",
  "donated at": "donatedAt",
  notes: "notes",
  "notes (optional)": "notes",
};

/**
 * Parses+validates an uploaded CSV/XLSX of donations. Never writes to the
 * DB — that only happens in /api/donations/import/commit, once the admin
 * has reviewed this preview and confirmed. Unlike devotees/users import,
 * there's no DB round trip here at all: a donation has no natural dedup
 * key, so validateImportRow is pure (see lib/validation/donation-import.ts).
 */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "donations");
  if (featureBlocked) return featureBlocked;

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const isCsv = file.name.toLowerCase().endsWith(".csv");

  const workbook = new ExcelJS.Workbook();
  let worksheet: ExcelJS.Worksheet;
  try {
    if (isCsv) {
      worksheet = await workbook.csv.read(Readable.from(buffer));
    } else {
      await workbook.xlsx.load(buffer as never);
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error("No worksheet found");
      worksheet = sheet;
    }
  } catch {
    return NextResponse.json(
      { error: "Could not read the uploaded file. Make sure it's a valid .csv or .xlsx file." },
      { status: 400 },
    );
  }

  const columnMap: Partial<Record<keyof RawImportRow, number>> = {};
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const key = String(cell.value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s*\((required|optional)\)\s*$/, "");
    const field = HEADER_ALIASES[key];
    if (field) columnMap[field] = colNumber;
  });

  const missingRequiredColumns: string[] = [];
  if (!columnMap.donorName) missingRequiredColumns.push("Donor Name");
  if (!columnMap.amount) missingRequiredColumns.push("Amount");
  if (missingRequiredColumns.length > 0) {
    return NextResponse.json(
      {
        error: missingRequiredColumns.map((column) => `Missing required column: ${column}`).join("\n"),
      },
      { status: 400 },
    );
  }

  const rawRows: { rowNumber: number; raw: RawImportRow }[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    if (rawRows.length >= MAX_ROWS) return;
    rawRows.push({
      rowNumber,
      raw: {
        donorName: columnMap.donorName ? row.getCell(columnMap.donorName).value : null,
        donorPhone: columnMap.donorPhone ? row.getCell(columnMap.donorPhone).value : null,
        donorEmail: columnMap.donorEmail ? row.getCell(columnMap.donorEmail).value : null,
        amount: columnMap.amount ? row.getCell(columnMap.amount).value : null,
        purpose: columnMap.purpose ? row.getCell(columnMap.purpose).value : null,
        paymentMethod: columnMap.paymentMethod ? row.getCell(columnMap.paymentMethod).value : null,
        donatedAt: columnMap.donatedAt ? row.getCell(columnMap.donatedAt).value : null,
        notes: columnMap.notes ? row.getCell(columnMap.notes).value : null,
      },
    });
  });

  if (rawRows.length >= MAX_ROWS) {
    return NextResponse.json({ error: `This file has too many rows (max ${MAX_ROWS}).` }, { status: 400 });
  }

  const rows: PreviewRow[] = rawRows.map(({ rowNumber, raw }) => validateImportRow(rowNumber, raw));

  const totalRows = rows.length;
  const validCount = rows.filter((r) => r.status === "valid").length;
  const invalidCount = rows.filter((r) => r.status === "invalid").length;
  const skippedCount = rows.filter((r) => r.status === "empty").length;

  return NextResponse.json({ totalRows, validCount, invalidCount, skippedCount, rows });
}
