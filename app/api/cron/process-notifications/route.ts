import { NextRequest, NextResponse } from "next/server";
import { listDueNotifications } from "@/lib/db/notifications";
import { processNotifications } from "@/lib/notifications/delivery";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { logCronRun } from "@/lib/cron/log-run";

const BATCH_LIMIT = 50;

/**
 * Not tenant/session-scoped — triggered by Railway Cron (see .env.example's
 * CRON_SECRET), not an admin request. Durable catch-all for retry backoff
 * across every notification type (birthday, welcome, devotee-registered,
 * event-reminder) and anything an after() hook missed (server restart,
 * after() failure) — mirrors app/api/cron/process-event-notifications/route.ts
 * exactly, generalized to the new `notifications` table.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await listDueNotifications(BATCH_LIMIT);
  await processNotifications(due.map((row) => row.id));
  await logCronRun("process_notifications", { processed: due.length });
  return NextResponse.json({ processed: due.length });
}
