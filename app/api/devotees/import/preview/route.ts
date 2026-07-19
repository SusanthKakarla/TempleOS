import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSessionAdmin } from "@/lib/auth/session";
import { listExistingPhones } from "@/lib/db/devotees";
import { normalizePhoneNumber } from "@/lib/phone.mts";
import { validateImportRow, type PreviewRow, type RawImportRow } from "@/lib/validation/devotee-import";

const MAX_ROWS = 2000;

const HEADER_ALIASES: Record<string, keyof RawImportRow> = {
  name: "name",
  "whatsapp phone": "phone",
  phone: "phone",
  "date of birth": "dob",
  "date of birth (yyyy-mm-dd)": "dob",
  dob: "dob",
  "birth star": "birthStar",
  gothram: "gothram",
  "gothram/ancestral lineage": "gothram",
  "ancestral lineage": "gothram",
};

/**
 * Parses+validates an uploaded CSV/XLSX of devotees. Never writes to the DB
 * — that only happens in /api/devotees/import/commit, once the admin has
 * reviewed this preview and confirmed.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const key = String(cell.value ?? "").trim().toLowerCase();
    const field = HEADER_ALIASES[key];
    if (field) columnMap[field] = colNumber;
  });

  if (!columnMap.name || !columnMap.phone) {
    return NextResponse.json(
      {
        error:
          'The file must have "Name" and "WhatsApp Phone" columns. Download the template for the exact format.',
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
        name: columnMap.name ? row.getCell(columnMap.name).value : null,
        phone: columnMap.phone ? row.getCell(columnMap.phone).value : null,
        dob: columnMap.dob ? row.getCell(columnMap.dob).value : null,
        birthStar: columnMap.birthStar ? row.getCell(columnMap.birthStar).value : null,
        gothram: columnMap.gothram ? row.getCell(columnMap.gothram).value : null,
      },
    });
  });

  if (rawRows.length >= MAX_ROWS) {
    return NextResponse.json({ error: `This file has too many rows (max ${MAX_ROWS}).` }, { status: 400 });
  }

  // A lightweight first pass just to collect candidate phone numbers, so
  // existing-in-DB duplicates can be fetched once for the whole batch rather
  // than one query per row.
  const candidatePhones = rawRows
    .map(({ raw }) => {
      const phoneRaw = raw.phone === null || raw.phone === undefined ? "" : String(raw.phone).trim();
      return phoneRaw ? normalizePhoneNumber(phoneRaw, "IN") : null;
    })
    .filter((p): p is string => p !== null);

  const existingPhones = await listExistingPhones(session.tenantId, candidatePhones);

  const seenPhones = new Set<string>();
  const rows: PreviewRow[] = rawRows.map(({ rowNumber, raw }) => {
    const result = validateImportRow(rowNumber, raw, seenPhones, existingPhones);
    if (result.normalizedPhone) seenPhones.add(result.normalizedPhone);
    return result;
  });

  const totalRows = rows.length;
  const validCount = rows.filter((r) => r.status === "valid").length;
  const invalidCount = rows.filter((r) => r.status === "invalid").length;
  const skippedCount = rows.filter(
    (r) => r.status === "empty" || r.status === "duplicate_in_file" || r.status === "duplicate_in_db",
  ).length;

  return NextResponse.json({ totalRows, validCount, invalidCount, skippedCount, rows });
}
