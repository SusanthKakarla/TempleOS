import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { getTenantWebsite, upsertTenantWebsite } from "@/lib/db/tenant-websites";
import { updateWebsiteSchema } from "@/lib/validation/website";

/**
 * The tenant admin's own public-website settings.
 *
 * Scoped entirely to the caller's session tenant — the tenant id is never
 * read from the request body, so an admin of one temple cannot edit another's
 * site by posting a different id.
 *
 * Only presentation fields live here. Timings, events, sevas, gallery and
 * contact details stay in their existing modules and flow through to the
 * public site automatically, which is why this route has no fields for them.
 */
export async function GET() {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);

  const website = await getTenantWebsite(auth.session.tenantId);
  return NextResponse.json({ website });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);

  const json = await req.json().catch(() => null);
  const parsed = updateWebsiteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const website = await upsertTenantWebsite(auth.session.tenantId, parsed.data);

  // The public site is rendered on a different hostname by the same
  // deployment, so its cached output has to be dropped explicitly. Paths are
  // revalidated under the /site prefix the middleware rewrites to — the
  // tenant's own pages only, never the whole platform's cache.
  for (const path of ["", "/about", "/timings", "/sevas", "/events", "/gallery", "/slokas", "/contact"]) {
    revalidatePath(`/site${path}`);
  }

  return NextResponse.json({ website });
}
