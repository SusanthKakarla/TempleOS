import { NextRequest, NextResponse } from "next/server";
import { resolveTenantHost } from "@/lib/auth/tenant-host";
import { getActiveTenantDomainByHostname } from "@/lib/db/tenant-domains";
import { devLog } from "@/lib/firebase/errors";

export async function GET(req: NextRequest) {
  const tenantHost = resolveTenantHost(req);
  if (!tenantHost) {
    devLog("Tenant context check rejected: invalid tenant context");
    return NextResponse.json(
      {
        error: "Use your temple's TempleOS subdomain to sign in.",
        code: "INVALID_TENANT_CONTEXT",
      },
      { status: 400 },
    );
  }

  const domain = await getActiveTenantDomainByHostname(tenantHost);
  if (!domain) {
    devLog("Tenant context check rejected: unknown or inactive tenant host", tenantHost);
    return NextResponse.json(
      {
        error: "Temple does not exist.",
        code: "TEMPLE_NOT_FOUND",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, hostname: domain.hostname });
}
