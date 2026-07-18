import { cookies } from "next/headers";
import { createSignedSessionToken, verifySignedSessionToken } from "./session-token";
import { getAdminById } from "@/lib/db/admin-users";
import type { AdminUser } from "@/types/db";

export const TENANT_SESSION_COOKIE_NAME = "templeos_session";
export const TENANT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface SessionPayload {
  adminId: string;
  tenantId: string;
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
  return verifySessionToken(token);
}

function isSessionPayload(payload: unknown): payload is SessionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "adminId" in payload &&
    "tenantId" in payload &&
    "phoneNumber" in payload &&
    "displayName" in payload &&
    "exp" in payload &&
    typeof payload.adminId === "string" &&
    typeof payload.tenantId === "string" &&
    typeof payload.phoneNumber === "string" &&
    typeof payload.displayName === "string" &&
    typeof payload.exp === "number"
  );
}

/**
 * Live authorization check for Super Admin-only routes/pages. Deliberately
 * re-reads the admin's current role from the database rather than trusting
 * whatever role a long-lived (30-day) session cookie might have baked in —
 * a role change or deactivation must take effect immediately, not after the
 * cookie expires.
 */
export async function requireLegacyTenantSuperAdmin(): Promise<AdminUser | null> {
  const session = await getSessionAdmin();
  if (!session) return null;

  const admin = await getAdminById(session.adminId);
  if (!admin || !admin.active || admin.role !== "super_admin") return null;

  return admin;
}
