import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import { getActiveTenantDomainByHostname } from "@/lib/db/tenant-domains";
import { bindPersonFirebaseUid, findPersonByPhone } from "@/lib/db/persons";
import { findActiveTenantMembershipByPersonAndTenant } from "@/lib/db/tenant-memberships";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { devLog } from "@/lib/firebase/errors";
import { isGenericTenantHostname, normalizeTenantHostname } from "@/lib/tenant-domains";

const bodySchema = z.object({ idToken: z.string().min(1) });
const localTenantHostEnv = "TEMPLEOS_LOCAL_TENANT_HOST";

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    devLog("Session request rejected: invalid body");
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(parsed.data.idToken);
  } catch (err) {
    devLog("Firebase ID token verification failed", err);
    return NextResponse.json({ error: "Invalid or expired login code" }, { status: 401 });
  }

  const phoneNumber = decoded.phone_number;
  if (typeof phoneNumber !== "string") {
    devLog("Verified token has no phone_number claim", decoded.uid);
    return NextResponse.json({ error: "No phone number on this account" }, { status: 401 });
  }

  const tenantHost = resolveTenantHost(req);
  if (!tenantHost) {
    devLog("Tenant sign-in rejected: invalid tenant context");
    return invalidTenantContext();
  }

  const domain = await getActiveTenantDomainByHostname(tenantHost);
  if (!domain) {
    devLog("Tenant sign-in rejected: unknown or inactive tenant host", tenantHost);
    return invalidTenantContext();
  }

  const person = await findPersonByPhone(phoneNumber);
  if (!person) {
    devLog("Sign-in rejected: phone number not allowlisted", phoneNumber);
    return NextResponse.json(
      {
        error: "This phone number is not authorized for dashboard access.",
        code: "NOT_AUTHORIZED",
      },
      { status: 403 },
    );
  }

  const membership = await findActiveTenantMembershipByPersonAndTenant({
    personId: person.id,
    tenantId: domain.tenantId,
  });
  if (!membership) {
    devLog("Tenant sign-in rejected: no active membership", person.id, domain.tenantId);
    return NextResponse.json(
      {
        error: "This phone number is not authorized for dashboard access.",
        code: "NOT_AUTHORIZED",
      },
      { status: 403 },
    );
  }

  const uidMatched = await bindPersonFirebaseUid(person.id, decoded.uid);
  if (!uidMatched) {
    devLog("Tenant sign-in rejected: Firebase UID mismatch", person.id);
    return NextResponse.json(
      {
        error: "This phone number is not authorized for dashboard access.",
        code: "NOT_AUTHORIZED",
      },
      { status: 403 },
    );
  }

  await setSessionCookie({
    tenantId: domain.tenantId,
    personId: person.id,
    membershipId: membership.id,
    roles: membership.roles,
    phoneNumber: person.phoneNumber,
    displayName: membership.displayName,
  });
  devLog("Session created for tenant member", membership.id, person.phoneNumber);

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

function resolveTenantHost(req: NextRequest): string | null {
  const override = process.env[localTenantHostEnv]?.trim();
  if (override) {
    if (process.env.NODE_ENV === "production") {
      devLog(`${localTenantHostEnv} is ignored in production tenant sign-in.`);
    } else {
      return normalizeTenantHostname(override);
    }
  }

  const nextUrlHostname = (req as { nextUrl?: { hostname?: string } }).nextUrl?.hostname;
  const requestHost =
    firstHeaderHost(req.headers.get("x-forwarded-host")) ||
    firstHeaderHost(req.headers.get("host")) ||
    nextUrlHostname ||
    "";
  const normalized = normalizeTenantHostname(requestHost);
  if (!normalized || isGenericTenantHostname(normalized)) return null;
  return normalized;
}

function firstHeaderHost(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();
  if (!first) return null;
  return first.split(":")[0] || null;
}

function invalidTenantContext(): NextResponse {
  return NextResponse.json(
    {
      error: "Use your temple's TempleOS subdomain to sign in.",
      code: "INVALID_TENANT_CONTEXT",
    },
    { status: 400 },
  );
}
