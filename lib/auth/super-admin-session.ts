import { cookies } from "next/headers";
import { getSuperAdminById } from "@/lib/db/super-admins";
import type { SuperAdmin } from "@/types/db";
import { createSignedSessionToken, verifySignedSessionToken } from "./session-token";

export const SUPER_ADMIN_SESSION_COOKIE_NAME = "templeos_super_admin_session";
export const SUPER_ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

export interface SuperAdminSessionPayload {
  superAdminId: string;
  phoneNumber: string;
  displayName: string;
  exp: number;
}

export function createSuperAdminSessionToken(
  payload: Omit<SuperAdminSessionPayload, "exp">,
): string {
  return createSignedSessionToken(payload, SUPER_ADMIN_SESSION_MAX_AGE_SECONDS);
}

export function verifySuperAdminSessionToken(token: string): SuperAdminSessionPayload | null {
  return verifySignedSessionToken(token, isSuperAdminSessionPayload);
}

export async function setSuperAdminSessionCookie(
  payload: Omit<SuperAdminSessionPayload, "exp">,
): Promise<void> {
  const token = createSuperAdminSessionToken(payload);
  const store = await cookies();
  store.set(SUPER_ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SUPER_ADMIN_SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSuperAdminSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SUPER_ADMIN_SESSION_COOKIE_NAME);
}

export async function getSuperAdminSession(): Promise<SuperAdminSessionPayload | null> {
  const store = await cookies();
  const token = store.get(SUPER_ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySuperAdminSessionToken(token);
}

export async function requireSuperAdmin(): Promise<SuperAdmin | null> {
  const session = await getSuperAdminSession();
  if (!session) return null;

  const superAdmin = await getSuperAdminById(session.superAdminId);
  if (!superAdmin || !superAdmin.active) return null;

  return superAdmin;
}

function isSuperAdminSessionPayload(payload: unknown): payload is SuperAdminSessionPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "superAdminId" in payload &&
    "phoneNumber" in payload &&
    "displayName" in payload &&
    "exp" in payload &&
    !("adminId" in payload) &&
    !("tenantId" in payload) &&
    typeof payload.superAdminId === "string" &&
    typeof payload.phoneNumber === "string" &&
    typeof payload.displayName === "string" &&
    typeof payload.exp === "number"
  );
}
