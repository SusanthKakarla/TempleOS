import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import { resolveTenantHost } from "@/lib/auth/tenant-host";
import { getActiveTenantDomainByHostname } from "@/lib/db/tenant-domains";
import { bindPersonFirebaseUid, findPersonByPhone } from "@/lib/db/persons";
import { findActiveTenantMembershipByPersonAndTenant } from "@/lib/db/tenant-memberships";
import { setLocaleCookie } from "@/lib/i18n/locale";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { devLog } from "@/lib/firebase/errors";

const bodySchema = z.object({ idToken: z.string().min(1) });

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
    return unknownTenant();
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
  await setLocaleCookie(membership.preferredUiLanguage ?? "en");
  devLog("Session created for tenant member", membership.id, person.phoneNumber);

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
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

function unknownTenant(): NextResponse {
  return NextResponse.json(
    {
      error: "Temple does not exist.",
      code: "TEMPLE_NOT_FOUND",
    },
    { status: 404 },
  );
}
