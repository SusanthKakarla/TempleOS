import { cookies } from "next/headers";
import { createSignedSessionToken, verifySignedSessionToken } from "./session-token";
import { getTenantMembershipById } from "@/lib/db/tenant-memberships";
import { getTenantById } from "@/lib/db/tenants";
import { isRoleCode, type RoleCode } from "@/types/db";

export const TENANT_SESSION_COOKIE_NAME = "templeos_session";
export const TENANT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface SessionPayload {
  tenantId: string;
  personId: string;
  membershipId: string;
  roles: RoleCode[];
  phoneNumber: string;
  displayName: string;
  exp: number;
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">): string {
  return createSignedSessionToken(payload, TENANT_SESSION_MAX_AGE_SECONDS);
}

export function verifySessionToken(token: string): SessionPayload | null {
  return verifySignedSessionToken(token, isSessionPayload);
}

export async function setSessionCookie(payload: Omit<SessionPayload, "exp">): Promise<void> {
  const token = createSessionToken(payload);
  const store = await cookies();
  store.set(TENANT_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TENANT_SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(TENANT_SESSION_COOKIE_NAME);
}

export async function getSessionAdmin(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(TENANT_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = verifySessionToken(token);
  if (!session) return null;

  const membership = await getTenantMembershipById(session.membershipId);
  if (!membership) return null;
  if (membership.tenantId !== session.tenantId || membership.personId !== session.personId) {
    return null;
  }

  // Total lockout for a non-active tenant (suspended/maintenance/archived/
  // disabled) — every tenant-facing page and API route resolves its session
  // through this one function, so this single check covers login, API
  // access, and data creation all at once.
  const tenant = await getTenantById(membership.tenantId);
  if (!tenant || tenant.status !== "active") return null;

  return {
    ...session,
    roles: membership.roles,
    displayName: membership.displayName,
  };
}

function isSessionPayload(payload: unknown): payload is SessionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "tenantId" in payload &&
    "personId" in payload &&
    "membershipId" in payload &&
    "roles" in payload &&
    "phoneNumber" in payload &&
    "displayName" in payload &&
    "exp" in payload &&
    typeof payload.tenantId === "string" &&
    typeof payload.personId === "string" &&
    typeof payload.membershipId === "string" &&
    Array.isArray(payload.roles) &&
    payload.roles.every(isRoleCode) &&
    typeof payload.phoneNumber === "string" &&
    typeof payload.displayName === "string" &&
    typeof payload.exp === "number"
  );
}
