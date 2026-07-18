import { createHmac, timingSafeEqual } from "node:crypto";

interface ExpiringPayload {
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

export function createSignedSessionToken<TPayload extends object>(
  payload: TPayload,
  maxAgeSeconds: number,
): string {
  const full: TPayload & ExpiringPayload = {
    ...payload,
    exp: Date.now() + maxAgeSeconds * 1000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifySignedSessionToken<TPayload extends ExpiringPayload>(
  token: string,
  isPayload: (payload: unknown) => payload is TPayload,
): TPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return null;

  const expectedSignature = sign(payloadB64);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as unknown;
    if (!isPayload(payload)) return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
