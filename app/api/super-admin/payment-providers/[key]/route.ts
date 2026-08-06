import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { updatePaymentProviderSettings } from "@/lib/db/payment-providers";
import { PaymentAuditService } from "@/lib/payments/payment-audit";
import type { PaymentProviderKey } from "@/types/db";

const bodySchema = z.object({
  status: z.enum(["active", "coming_soon"]).optional(),
  manualEnabled: z.boolean().optional(),
  partnerEnabled: z.boolean().optional(),
  defaultConnectionMethod: z.enum(["manual", "partner"]).optional(),
});

interface RouteContext {
  params: Promise<{ key: string }>;
}

/** Platform-wide toggle — Super Admin only, affects every tenant simultaneously. */
export async function PUT(req: NextRequest, context: RouteContext) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return NextResponse.json({ error: "Super Admin session required", code: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { key } = await context.params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request.", code: "VALIDATION_ERROR" }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No changes provided.", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  // `key` is an unverified URL path segment — passed straight through to a
  // parameterized WHERE clause with no matching row for an unknown key
  // (updatePaymentProviderSettings returns null, handled as 404 below), so
  // an invalid value fails closed rather than needing its own allowlist check.
  const provider = await updatePaymentProviderSettings(key as PaymentProviderKey, parsed.data);
  if (!provider) {
    return NextResponse.json({ error: "Payment provider not found.", code: "PROVIDER_NOT_FOUND" }, { status: 404 });
  }

  await PaymentAuditService.platformProviderSettingsUpdated(superAdmin.id, provider.key, parsed.data);

  return NextResponse.json({ provider });
}
