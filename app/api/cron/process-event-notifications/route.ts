import { NextRequest, NextResponse } from "next/server";
import { listDueEventNotifications } from "@/lib/db/event-notifications";
import { processEventNotifications } from "@/lib/whatsapp/event-notifications";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { logCronRun } from "@/lib/cron/log-run";

const BATCH_LIMIT = 50;

/**
 * Not tenant/session-scoped — triggered by Railway Cron (see .env.example's
 * CRON_SECRET), not an admin request. Durable catch-all for the retry
 * backoff and anything the PATCH route's after() call misses (server
 * restart, after() failure). Safe to invoke directly (unlike Meta's inbound
 * webhook) since this is an outbound-trigger route we own.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await listDueEventNotifications(BATCH_LIMIT);
  await processEventNotifications(due.map((row) => row.id));
  await logCronRun("process_event_notifications", { processed: due.length });
  return NextResponse.json({ processed: due.length });
}
