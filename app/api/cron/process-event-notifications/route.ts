import { NextRequest, NextResponse } from "next/server";
import { listDueEventNotifications } from "@/lib/db/event-notifications";
import { processEventNotifications } from "@/lib/whatsapp/event-notifications";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { logCronRun } from "@/lib/cron/log-run";

const BATCH_LIMIT = 50;

/**
 * Not tenant/session-scoped — triggered by Railway Cron (see .env.example's
 * CRON_SECRET), not an admin request. Safe to invoke directly (unlike Meta's
 * inbound webhook) since this is an outbound-trigger route we own.
 *
 * event_notifications no longer receives new rows (see lib/db/event-notifications.ts) —
 * new/updated/cancelled event announcements enqueue through the generic
 * engine now, which app/api/cron/process-notifications/route.ts sweeps
 * instead. This cron's only remaining job is the retry backoff for rows the
 * "Resend failed" action (app/api/events/[id]/notifications/resend/route.ts)
 * puts back to `pending`/`retrying` — kept alive only for that, not deleted
 * alongside the rest of the legacy write path so that action keeps working.
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
