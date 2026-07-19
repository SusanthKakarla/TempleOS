import { NextResponse } from "next/server";
import type { ExportFile } from "./types";

/**
 * Shared by every module's export route. The cast is TypeScript 5.7+'s
 * stricter typed-array generics (Uint8Array<ArrayBufferLike> vs the DOM
 * lib's BodyInit wanting ArrayBufferView<ArrayBuffer>) — a known
 * ecosystem-wide friction point, not a real safety concern; a Buffer/
 * Uint8Array is always valid Response body content at runtime.
 */
export function fileResponse(file: ExportFile): NextResponse {
  return new NextResponse(file.buffer as BodyInit, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    },
  });
}
