import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getAdminById } from "@/lib/db/admin-users";
import type { AdminUser } from "@/types/db";

const COOKIE_NAME = "templeos_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface SessionPayload {
  adminId: string;
  tenantId: string;
  phoneNumber: string;
  displayName: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return secret;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const full: SessionPayload = { ...payload, exp: Date.now() + MAX_AGE_SECONDS * 1000 };
  const payloadB64 = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expectedSignature = sign(payloadB64);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: Omit<SessionPayload, "exp">): Promise<void> {
  const token = createSessionToken(payload);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionAdmin(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Live authorization check for Super Admin-only routes/pages. Deliberately
 * re-reads the admin's current role from the database rather than trusting
 * whatever role a long-lived (30-day) session cookie might have baked in —
 * a role change or deactivation must take effect immediately, not after the
 * cookie expires.
 */
export async function requireSuperAdmin(): Promise<AdminUser | null> {
  const session = await getSessionAdmin();
  if (!session) return null;

  const admin = await getAdminById(session.adminId);
  if (!admin || !admin.active || admin.role !== "super_admin") return null;

  return admin;
}
