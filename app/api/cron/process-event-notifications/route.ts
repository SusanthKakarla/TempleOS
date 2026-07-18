import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { listDueEventNotifications } from "@/lib/db/event-notifications";
import { processEventNotifications } from "@/lib/whatsapp/event-notifications";

const BATCH_LIMIT = 50;

/**
 * Not tenant/session-scoped — triggered by Railway Cron (see .env.example's
 * CRON_SECRET), not an admin request. Durable catch-all for the retry
 * backoff and anything the PATCH route's after() call misses (server
 * restart, after() failure). Safe to invoke directly (unlike Meta's inbound
 * webhook) since this is an outbound-trigger route we own.
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

  const due = await listDueEventNotifications(BATCH_LIMIT);
  await processEventNotifications(due.map((row) => row.id));
  return NextResponse.json({ processed: due.length });
}
