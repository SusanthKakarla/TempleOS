import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { getTenantById } from "@/lib/db/tenants";
import { getTenantWebsite, upsertTenantWebsite } from "@/lib/db/tenant-websites";
import { updateWebsiteSchema } from "@/lib/validation/website";

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/**
 * Super Admin's view of one temple's website configuration.
 *
 * Shares the schema and repository with the tenant-facing /api/website — the
 * two differ only in who is authorised and how the tenant is chosen. Here the
 * tenant comes from the path and is checked to exist; the tenant route takes
 * it from the session. Neither ever reads it from the request body.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tenantId } = await params;
  const tenant = await getTenantById(tenantId);
  if (!tenant) return NextResponse.json({ error: "Temple not found" }, { status: 404 });

  return NextResponse.json({ website: await getTenantWebsite(tenantId) });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tenantId } = await params;
  const tenant = await getTenantById(tenantId);
  if (!tenant) return NextResponse.json({ error: "Temple not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = updateWebsiteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const website = await upsertTenantWebsite(tenantId, parsed.data);

  for (const path of ["", "/about", "/timings", "/sevas", "/events", "/gallery", "/slokas", "/contact"]) {
    revalidatePath(`/site${path}`);
  }

  return NextResponse.json({ website });
}
