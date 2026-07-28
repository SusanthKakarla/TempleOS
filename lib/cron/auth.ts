import type { NextRequest } from "next/server";
import { timingSafeEqualString } from "@/lib/timing-safe-equal";

/** Shared by every Railway Cron route (see .env.example's CRON_SECRET) — not tenant/session-scoped. */
export function isAuthorizedCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization");
  if (!secret || !provided) return false;
  return timingSafeEqualString(`Bearer ${secret}`, provided);
}
