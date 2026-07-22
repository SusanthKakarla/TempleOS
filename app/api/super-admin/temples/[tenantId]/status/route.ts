import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { setTenantStatus } from "@/lib/db/tenants";
import { listTenantMembershipsForTenant } from "@/lib/db/tenant-memberships";
import { enqueueNotification } from "@/lib/notifications/engine";
import { processNotifications } from "@/lib/notifications/delivery";
import { TENANT_STATUSES } from "@/types/db";

const bodySchema = z.object({ status: z.enum(TENANT_STATUSES) });

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/** Only a platform Super Admin may change a tenant's lifecycle status. */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return NextResponse.json({ error: "Super Admin session required", code: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { tenantId } = await context.params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const tenant = await setTenantStatus(tenantId, parsed.data.status, superAdmin.id);
  if (!tenant) {
    return NextResponse.json({ error: "Temple not found.", code: "TEMPLE_NOT_FOUND" }, { status: 404 });
  }

  const staff = await listTenantMembershipsForTenant(tenantId, { status: "active" });
  const admins = staff.filter((member) => member.roles.includes("admin"));
  const createdIds: string[] = [];
  for (const admin of admins) {
    const language = admin.preferredUiLanguage ?? "en";
    const created = await enqueueNotification({
      tenantId,
      recipient: { personId: admin.personId },
      notificationType: "tenant_status_changed",
      category: "platform",
      language,
      templateVars: { templeName: tenant.name, status: parsed.data.status },
    });
    createdIds.push(...created.map((n) => n.id));
  }
  if (createdIds.length > 0) {
    after(() => processNotifications(createdIds));
  }

  return NextResponse.json({ tenant });
}
