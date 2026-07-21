import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { listDueNotifications } from "@/lib/db/notifications";
import { processNotifications } from "@/lib/notifications/delivery";

const BATCH_LIMIT = 50;

/**
 * Not tenant/session-scoped — triggered by Railway Cron (see .env.example's
 * CRON_SECRET), not an admin request. Durable catch-all for retry backoff
 * across every notification type (birthday, welcome, devotee-registered,
 * event-reminder) and anything an after() hook missed (server restart,
 * after() failure) — mirrors app/api/cron/process-event-notifications/route.ts
 * exactly, generalized to the new `notifications` table.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization");
  if (!secret || !provided) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await listDueNotifications(BATCH_LIMIT);
  await processNotifications(due.map((row) => row.id));
  return NextResponse.json({ processed: due.length });
}
