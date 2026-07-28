import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { logCronRun } from "@/lib/cron/log-run";
import { reconcileAllTenants } from "@/lib/payments/reconciliation-service";

/**
 * Nightly reconciliation — compares every connected tenant's still-pending
 * transactions against what Razorpay actually shows, auto-resolving missed
 * webhooks. Not tenant/session-scoped — triggered by Railway Cron, matching
 * the existing process-notifications/daily-birthday-check/process-event-notifications
 * routes' exact auth + logging shape.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await reconcileAllTenants();
  await logCronRun("reconcile_payments", { ...result });
  return NextResponse.json(result);
}
