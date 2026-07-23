import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/** Shared by every Railway Cron route (see .env.example's CRON_SECRET) — not tenant/session-scoped. */
export function isAuthorizedCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization");
  if (!secret || !provided) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
