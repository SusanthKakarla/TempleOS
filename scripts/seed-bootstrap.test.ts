import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function listSourceFiles(relativePath: string): string[] {
  const fullPath = path.join(root, relativePath);
  try {
    const stat = statSync(fullPath);
    if (stat.isFile()) return [relativePath];
    return readdirSync(fullPath).flatMap((entry) => listSourceFiles(path.join(relativePath, entry)));
  } catch {
    return [];
  }
}

describe("Story 1.2 production bootstrap scripts", () => {
  it("exposes seed:super-admin as the explicit platform bootstrap command", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts["seed:super-admin"]).toBe("node scripts/seed-super-admin.mjs");
  });

  it("exposes a narrow stale Firebase binding reset command", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    const source = read("scripts/clear-person-firebase-uid.mts");

    expect(pkg.scripts["auth:clear-firebase"]).toBe("tsx scripts/clear-person-firebase-uid.mts");
    expect(source).toContain("clearPersonFirebaseUidByPhone");
    expect(source).toContain("--phone");
    expect(source).not.toMatch(/tenant_memberships|tenant_membership_roles|super_admins/i);
  });

  it("keeps production seed paths off admin_users and getPilotTenant", () => {
    for (const file of ["scripts/seed.mts", "scripts/seed-super-admin.mjs"]) {
      const source = read(file);
      expect(source).not.toMatch(/admin_users|admin-users|upsertAdminUser/);
      expect(source).not.toMatch(/getPilotTenant/);
      expect(source).not.toMatch(/tenant_memberships|tenant_membership_roles/);
    }
  });

  it("does not expose retired pilot-only seed commands", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts["seed:admin"]).toBeUndefined();
    expect(pkg.scripts["seed:whatsapp"]).toBeUndefined();
  });

  it("documents the real first super admin as CLI or env seed input, not hardcoded SQL", () => {
    const source = read("scripts/seed-super-admin.mjs");
    expect(source).toContain("SUPER_ADMIN_PHONE_NUMBER");
    expect(source).toContain("SUPER_ADMIN_DISPLAY_NAME");
    expect(source).not.toContain("+917995362200");
  });
});

describe("Story 2.6 production provisioning path guardrails", () => {
  it("keeps production provisioning entrypoints away from pilot and legacy admin footguns", () => {
    for (const file of [
      "lib/provisioning/temples.ts",
      "app/api/super-admin/temples/route.ts",
      "scripts/provision-temple.mts",
    ]) {
      const source = read(file);
      expect(source).not.toMatch(/getPilotTenant|admin_users|admin-users|upsertAdminUser/i);
      expect(source).not.toMatch(/requireTenantAdminSession|getSessionAdmin/i);
    }
  });

  it("keeps API and CLI provisioning entrypoints on the canonical service path", () => {
    for (const file of ["app/api/super-admin/temples/route.ts", "scripts/provision-temple.mts"]) {
      const source = read(file);
      expect(source).toMatch(/@\/lib\/provisioning\/temples/);
      expect(source).toMatch(/parseProvisionTempleInput/);
      expect(source).toMatch(/provisionTemple/);
      expect(source).not.toMatch(
        /createTenantForSuperAdmin|createTenantDomainForSuperAdmin|findOrCreatePersonByPhoneForProvisioning|createTenantMembershipForProvisioning|assignTenantMembershipRolesForProvisioning|linkWhatsAppAccountForProvisioning|createAuditLogEntry/i,
      );
      expect(source).not.toMatch(/pool\.query|client\.query/i);
      expect(source).not.toMatch(
        /\binsert\s+into\s+(tenants|tenant_domains|persons|tenant_memberships|tenant_membership_roles|whatsapp_accounts|audit_log)\b/i,
      );
    }
  });
});

describe("Epic 3 super-admin temple operation guardrails", () => {
  it("keeps broad super-admin temple read functions out of tenant-dashboard code paths", () => {
    const files = [
      ...listSourceFiles("app/(dashboard)"),
      ...listSourceFiles("app/api").filter((file) => {
        if (!/\/route\.tsx?$/.test(file)) return false;
        if (file.startsWith("app/api/super-admin/")) return false;
        const source = read(file);
        return /@\/lib\/auth\/tenant-admin|requireTenantAdminSession/.test(source);
      }),
      ...listSourceFiles("lib/auth/session.ts"),
      ...listSourceFiles("lib/auth/tenant-admin.ts"),
    ].filter((file) => /\.(ts|tsx)$/.test(file) && !file.endsWith(".test.ts"));

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/listTenantsForSuperAdmin/);
      expect(source).not.toMatch(/getTenantDetailForSuperAdmin/);
      expect(source).not.toMatch(/updateProvisionedTemple|updateProvisionedTenantDetailsForSuperAdmin/);
    }
  });

  it("keeps the super-admin temple list page behind the super-admin boundary", () => {
    const source = read("app/(super-admin)/super-admin/temples/page.tsx");
    expect(source).toMatch(/requireSuperAdminPage/);
    expect(source).toMatch(/listTenantsForSuperAdmin/);
    expect(source).toMatch(/\/super-admin\/temples\/new/);
    expect(source).not.toMatch(/getPilotTenant|admin_users|admin-users/i);
    expect(source).not.toMatch(/requireTenantAdminSession|getSessionAdmin/i);
    expect(source.indexOf("await requireSuperAdminPage()")).toBeLessThan(
      source.indexOf("await listTenantsForSuperAdmin()"),
    );
  });

  it("keeps the super-admin temple detail page behind the super-admin boundary", () => {
    const source = read("app/(super-admin)/super-admin/temples/[tenantId]/page.tsx");
    expect(source).toMatch(/requireSuperAdminPage/);
    expect(source).toMatch(/fetchTempleDetailForSuperAdmin/);
    expect(source).toMatch(/\/api\/super-admin\/temples\/\$\{tenantId\}/);
    expect(source).toMatch(/TempleDetailEditForm/);
    expect(source).not.toMatch(/getTenantDetailForSuperAdmin/);
    expect(source).not.toMatch(/updateProvisionedTemple|updateProvisionedTenantDetailsForSuperAdmin/);
    expect(source).toMatch(/notFound\(\)/);
    expect(source).not.toMatch(/getPilotTenant|admin_users|admin-users/i);
    expect(source).not.toMatch(/requireTenantAdminSession|getSessionAdmin/i);
    expect(source.indexOf("await requireSuperAdminPage")).toBeLessThan(
      source.indexOf("await fetchTempleDetailForSuperAdmin"),
    );
  });

  it("keeps the super-admin temple detail route update on the canonical service path", () => {
    const source = read("app/api/super-admin/temples/[tenantId]/route.ts");
    expect(source).toMatch(/export async function PATCH/);
    expect(source).toMatch(/requireSuperAdmin/);
    expect(source).toMatch(/parseUpdateProvisionedTempleInput/);
    expect(source).toMatch(/updateProvisionedTemple/);
    expect(source).not.toMatch(/updateProvisionedTenantDetailsForSuperAdmin/);
    expect(source).not.toMatch(/pool\.query|client\.query/i);
    expect(source).not.toMatch(/insert\s+into|update\s+tenants/i);
  });
});
