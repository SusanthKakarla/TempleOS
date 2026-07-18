import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function listRouteSources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) return listRouteSources(fullPath);
    return fullPath.endsWith(".ts") && !fullPath.endsWith(".test.ts") ? [fullPath] : [];
  });
}

describe("super admin auth boundary", () => {
  it("keeps platform auth routes independent from tenant admin tables", () => {
    const sources = [
      ...listRouteSources(path.join(process.cwd(), "app/api/super-admin")),
      path.join(process.cwd(), "lib/auth/super-admin-session.ts"),
    ];

    for (const source of sources) {
      const body = readFileSync(source, "utf8");
      expect(body, source).not.toMatch(/admin-users|admin_users|getPilotTenant/i);
      expect(body, source).not.toMatch(/requireLegacyTenantSuperAdmin/i);
      expect(body, source).not.toMatch(/@\/lib\/auth\/tenant-admin/i);
    }
  });

  it("keeps temple provisioning behind the canonical provisioning service", () => {
    const source = readFileSync(
      path.join(process.cwd(), "app/api/super-admin/temples/route.ts"),
      "utf8",
    );

    expect(source).toMatch(/@\/lib\/provisioning\/temples/);
    expect(source).toMatch(/provisionTemple/);
    expect(source).not.toMatch(/createTenant\w*|createTenantDomain\w*/i);
    expect(source).not.toMatch(/createTenantMembership\w*|linkWhatsAppAccount\w*/i);
    expect(source).not.toMatch(/insert\s+into\s+(tenants|tenant_domains|tenant_memberships|tenant_membership_roles|whatsapp_accounts)/i);
  });
});
