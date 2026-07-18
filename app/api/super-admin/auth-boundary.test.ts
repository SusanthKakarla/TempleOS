import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function listRouteSources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) return listRouteSources(fullPath);
    return (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) && !fullPath.endsWith(".test.ts")
      ? [fullPath]
      : [];
  });
}

function listSourcesIfPresent(dir: string): string[] {
  try {
    statSync(dir);
  } catch {
    return [];
  }
  return listRouteSources(dir);
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

  it("keeps super admin UI free of tenant provisioning footguns and deferred controls", () => {
    const sources = [
      ...listSourcesIfPresent(path.join(process.cwd(), "app/(super-admin)")),
      ...listSourcesIfPresent(path.join(process.cwd(), "features/super-admin")),
    ];

    expect(sources.length).toBeGreaterThan(0);

    for (const source of sources) {
      const body = readFileSync(source, "utf8");
      expect(body, source).not.toMatch(/public signup|approval queue|billing|tenant deletion|tenant transfer|impersonation|data export|embedded signup/i);
      expect(body, source).not.toMatch(/admin_users|getPilotTenant/i);
      expect(body, source).not.toMatch(/@\/lib\/auth\/tenant-admin/i);
      expect(body, source).not.toMatch(/createTenantForSuperAdmin|createTenantDomainForSuperAdmin|createTenantMembershipForProvisioning|linkWhatsAppAccountForProvisioning/i);
      expect(body, source).not.toMatch(/insert\s+into\s+(tenants|tenant_domains|tenant_memberships|tenant_membership_roles|whatsapp_accounts)/i);
    }
  });

  it("keeps super admin UI pages behind the super-admin session boundary", () => {
    const pageSource = readFileSync(
      path.join(process.cwd(), "app/(super-admin)/super-admin/temples/new/page.tsx"),
      "utf8",
    );
    const guardSource = readFileSync(
      path.join(process.cwd(), "app/(super-admin)/super-admin/require-super-admin.ts"),
      "utf8",
    );

    expect(pageSource).toMatch(/requireSuperAdminPage/);
    expect(guardSource).toMatch(/@\/lib\/auth\/super-admin-session/);
    expect(guardSource).toMatch(/requireSuperAdmin/);
    expect(guardSource).toMatch(/forbidden/);
  });
});
