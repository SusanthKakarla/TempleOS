import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { getTenantById } from "@/lib/db/tenants";
import { listTenantFeatures, setTenantFeature, TenantFeatureError } from "@/lib/db/tenant-features";
import { listTenantMembershipsForTenant } from "@/lib/db/tenant-memberships";
import { enqueueNotification } from "@/lib/notifications/engine";
import { processNotifications } from "@/lib/notifications/delivery";
import type { FeatureKey } from "@/types/db";

const bodySchema = z.object({
  featureKey: z.string().min(1),
  enabled: z.boolean(),
});

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return NextResponse.json({ error: "Super Admin session required", code: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { tenantId } = await context.params;
  const features = await listTenantFeatures(tenantId);
  return NextResponse.json({ features });
}

/** Only a platform Super Admin may enable/disable a tenant's modules. */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return NextResponse.json({ error: "Super Admin session required", code: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { tenantId } = await context.params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Temple not found.", code: "TEMPLE_NOT_FOUND" }, { status: 404 });
  }

  try {
    const tenantFeature = await setTenantFeature(
      tenantId,
      parsed.data.featureKey as FeatureKey,
      parsed.data.enabled,
      superAdmin.id,
    );

    const staff = await listTenantMembershipsForTenant(tenantId, { status: "active" });
    const admins = staff.filter((member) => member.roles.includes("admin"));
    const createdIds: string[] = [];
    for (const admin of admins) {
      const language = admin.preferredUiLanguage ?? "en";
      const created = await enqueueNotification({
        tenantId,
        recipient: { personId: admin.personId },
        notificationType: "tenant_config_changed",
        category: "platform",
        language,
        templateVars: {
          summary: `${parsed.data.featureKey} was ${parsed.data.enabled ? "enabled" : "disabled"} for ${tenant.name}.`,
        },
      });
      createdIds.push(...created.map((n) => n.id));
    }
    if (createdIds.length > 0) {
      after(() => processNotifications(createdIds));
    }

    return NextResponse.json({ tenantFeature });
  } catch (err) {
    if (err instanceof TenantFeatureError) {
      const status = err.code === "FEATURE_NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    throw err;
  }
}
