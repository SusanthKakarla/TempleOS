import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { logCronRun } from "@/lib/cron/log-run";
import { listConnectedWhatsAppAccounts } from "@/lib/db/whatsapp-accounts";
import { listPendingTemplatesForTenant, setApprovalStatus } from "@/lib/db/whatsapp-message-templates";
import { validatePlatformAccessToken } from "@/lib/whatsapp/embedded-signup";
import { syncTemplateApprovalStatus } from "@/lib/whatsapp/template-sync";

/**
 * Continuous background sync — Railway Cron trigger (no in-repo schedule
 * config; add the schedule in Railway's dashboard pointing at this route).
 * Only ever calls the existing read-only syncTemplateApprovalStatus — no
 * webhook re-subscription, no sends. Mirrors the shape of the other 3 cron
 * routes exactly (auth + logCronRun), looping every connected tenant's
 * pending templates rather than one tenant's.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokenCheck = await validatePlatformAccessToken();
  if (!tokenCheck.success) {
    await logCronRun("sync_whatsapp_templates", { error: `Platform token invalid: ${tokenCheck.error}` });
    return NextResponse.json({ error: tokenCheck.error }, { status: 200 });
  }

  const accounts = await listConnectedWhatsAppAccounts();
  let templatesChecked = 0;
  let approved = 0;
  let stillPending = 0;
  let errors = 0;

  for (const account of accounts) {
    const pending = await listPendingTemplatesForTenant(account.tenantId);
    for (const template of pending) {
      templatesChecked += 1;
      try {
        const metaStatus = await syncTemplateApprovalStatus(
          account.metaBusinessAccountId,
          template.metaTemplateName,
          template.language,
        );
        if (!metaStatus) {
          stillPending += 1;
          continue;
        }
        await setApprovalStatus(account.tenantId, template.id, metaStatus);
        if (metaStatus === "approved") {
          approved += 1;
        } else {
          stillPending += 1;
        }
      } catch {
        errors += 1;
      }
    }
  }

  await logCronRun("sync_whatsapp_templates", {
    tenantsChecked: accounts.length,
    templatesChecked,
    approved,
    stillPending,
    errors,
  });
  return NextResponse.json({ tenantsChecked: accounts.length, templatesChecked, approved, stillPending, errors });
}
