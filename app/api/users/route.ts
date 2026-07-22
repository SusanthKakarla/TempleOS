import { after, NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { listTenantMembershipsForTenant } from "@/lib/db/tenant-memberships";
import { getTenantById } from "@/lib/db/tenants";
import {
  inviteTenantMember,
  parseInviteTenantMemberInput,
  TenantMemberActionError,
} from "@/lib/provisioning/tenant-members";
import { enqueueNotification } from "@/lib/notifications/engine";
import { processNotifications } from "@/lib/notifications/delivery";
import { isRoleCode, type TenantMembershipStatus } from "@/types/db";

export async function GET(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "user_management");
  if (featureBlocked) return featureBlocked;

  const params = req.nextUrl.searchParams;
  const statusParam = params.get("status");
  const roleParam = params.get("role");

  const members = await listTenantMembershipsForTenant(session.tenantId, {
    search: params.get("search") ?? undefined,
    status: statusParam === "active" || statusParam === "inactive" ? (statusParam as TenantMembershipStatus) : undefined,
    role: roleParam && isRoleCode(roleParam) ? roleParam : undefined,
  });

  return NextResponse.json({ members });
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "user_management");
  if (featureBlocked) return featureBlocked;

  const json = await req.json().catch(() => null);
  const parsed = parseInviteTenantMemberInput(json);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.errors[0]?.message ?? "Invalid input", errors: parsed.errors },
      { status: 400 },
    );
  }

  try {
    const member = await inviteTenantMember(parsed.data, {
      type: "tenant_member",
      tenantId: session.tenantId,
      membershipId: session.membershipId,
    });

    // Onboarding notification (see migrations/013_notification_engine.sql).
    // Enqueue happens synchronously (fast, bounded DB insert) so the row is
    // durable even if the process restarts before after() runs; the actual
    // WhatsApp send happens post-response via after() so inviting a user
    // never waits on Graph API calls — mirrors the event-notification
    // pattern in app/api/events/[id]/route.ts.
    const tenant = await getTenantById(session.tenantId);
    if (tenant) {
      const roleLabel = member.roles.map((role) => role.replace(/_/g, " ")).join(", ");
      const created = await enqueueNotification({
        tenantId: session.tenantId,
        recipient: { personId: member.personId },
        notificationType: "user_welcome",
        category: "new_user",
        language: member.preferredUiLanguage ?? "en",
        templateVars: { role: roleLabel, templeName: tenant.name },
      });
      if (created.length > 0) {
        after(() => processNotifications(created.map((n) => n.id)));
      }
    }

    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    if (err instanceof TenantMemberActionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to invite user" }, { status: 500 });
  }
}
