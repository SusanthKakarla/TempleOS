import type { NextRequest } from "next/server";
import { devLog } from "@/lib/firebase/errors";
import { isGenericTenantHostname, normalizeTenantHostname } from "@/lib/tenant-domains";

const localTenantHostEnv = "TEMPLEOS_LOCAL_TENANT_HOST";

export function resolveTenantHost(req: NextRequest): string | null {
  const override = process.env[localTenantHostEnv]?.trim();
  if (override) {
    if (process.env.NODE_ENV === "production") {
      devLog(`${localTenantHostEnv} is ignored in production tenant sign-in.`);
    } else {
      return normalizeTenantHostname(override);
    }
  }

  const nextUrlHostname = req.nextUrl?.hostname;
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
