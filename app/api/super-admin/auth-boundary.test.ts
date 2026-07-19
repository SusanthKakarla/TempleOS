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
    expect(guardSource).toMatch(/redirect\(`\/super-admin\/login\?next=/);
    expect(guardSource).toMatch(/forbidden/);
  });

  it("keeps the super admin login page on the super-admin session endpoint", () => {
    const pageSource = readFileSync(
      path.join(process.cwd(), "app/(super-admin)/super-admin/login/page.tsx"),
      "utf8",
    );
    const formSource = readFileSync(
      path.join(process.cwd(), "features/super-admin/super-admin-login-form.tsx"),
      "utf8",
    );

    expect(pageSource).toMatch(/requireSuperAdmin/);
    expect(pageSource).toMatch(/redirect\(redirectPath\)/);
    expect(pageSource).toMatch(/getSafeSuperAdminNextPath/);
    expect(formSource).toMatch(/\/api\/super-admin\/auth\/session/);
    expect(formSource).toMatch(/credentials:\s*"same-origin"/);
    expect(formSource).toMatch(/router\.push\(redirectPath\)/);
    expect(`${pageSource}\n${formSource}`).not.toMatch(/\/api\/auth\/session/);
    expect(`${pageSource}\n${formSource}`).not.toMatch(
      /templeos_session|setSessionCookie|TENANT_SESSION_COOKIE_NAME/,
    );
  });

  it("keeps the super-admin temple detail page behind auth and within read-only V0 scope", () => {
    const source = readFileSync(
      path.join(process.cwd(), "app/(super-admin)/super-admin/temples/[tenantId]/page.tsx"),
      "utf8",
    );

    expect(source).toMatch(/params:\s*Promise<\{\s*tenantId:\s*string\s*\}>/);
    expect(source).toMatch(/await params/);
    expect(source).toMatch(/requireSuperAdminPage/);
    expect(source).toMatch(/fetchTempleDetailForSuperAdmin/);
    expect(source).toMatch(/\/api\/super-admin\/temples\/\$\{tenantId\}/);
    expect(source).toMatch(/TempleDetailEditForm/);
    expect(source).not.toMatch(/getTenantDetailForSuperAdmin/);
    expect(source).not.toMatch(/updateProvisionedTemple|updateProvisionedTenantDetailsForSuperAdmin/);
    expect(source.indexOf("await requireSuperAdminPage")).toBeLessThan(
      source.indexOf("await fetchTempleDetailForSuperAdmin"),
    );
    expect(source).toMatch(/notFound\(\)/);
    expect(source).toMatch(/\/super-admin/);
    expect(source).toMatch(/Members/);
    expect(source).toMatch(/WhatsApp/);
    expect(source).not.toMatch(/delete|transfer|impersonat|data export|disconnect|embedded signup/i);
  });

  it("keeps the super-admin role catalog page behind auth and fixed-role only", () => {
    const source = readFileSync(
      path.join(process.cwd(), "app/(super-admin)/super-admin/roles/page.tsx"),
      "utf8",
    );
    const indexSource = readFileSync(
      path.join(process.cwd(), "app/(super-admin)/super-admin/page.tsx"),
      "utf8",
    );

    expect(source).toMatch(/requireSuperAdminPage/);
    expect(source).toMatch(/listRoleDefinitionsForSuperAdmin/);
    expect(source).not.toMatch(/headers|x-forwarded-proto|getAll\(\)|cookieHeader|fetch\(/);
    expect(source).toMatch(/admin/);
    expect(source).toMatch(/priest/);
    expect(source).toMatch(/committee_member/);
    expect(source).toMatch(/volunteer/);
    expect(source).toMatch(/devotee/);
    expect(source).toMatch(/Role Catalog/);
    expect(source).not.toMatch(/create|rename|delete|deactivate|tenant override|custom-role|capability-edit|billing|impersonat|data export|disconnect|embedded signup/i);
    expect(indexSource).toMatch(/\/super-admin\/roles/);
  });

  it("keeps Story 3.4 out of tenant member role assignment mutation scope", () => {
    const sources = [
      readFileSync(path.join(process.cwd(), "app/api/super-admin/roles/route.ts"), "utf8"),
      readFileSync(path.join(process.cwd(), "app/(super-admin)/super-admin/roles/page.tsx"), "utf8"),
    ].join("\n");

    expect(sources).toMatch(/listRoleDefinitionsForSuperAdmin/);
    expect(sources).not.toMatch(/assignTenantMemberRoles|tenant_membership_roles|membershipId|members\/\[/);
    expect(sources).not.toMatch(/tenantId|display-label edits|role-code edits|active-state toggles|tenant override/i);
  });

  it("keeps the temple detail edit form limited to safe update fields and duplicate-submit guarded", () => {
    const formSource = readFileSync(
      path.join(process.cwd(), "features/super-admin/temple-detail-edit-form.tsx"),
      "utf8",
    );
    const helperSource = readFileSync(
      path.join(process.cwd(), "features/super-admin/temple-detail-edit-form-helpers.ts"),
      "utf8",
    );

    expect(formSource).toMatch(/method:\s*"PATCH"/);
    expect(formSource).toMatch(/submittingRef/);
    expect(formSource).toMatch(/router\.refresh/);
    expect(helperSource).toMatch(/name/);
    expect(helperSource).toMatch(/defaultContactPhone/);
    expect(helperSource).toMatch(/address/);
    expect(helperSource).toMatch(/timezone/);
    expect(`${formSource}\n${helperSource}`).not.toMatch(
      /slug|hostname|delete|transfer|billing|impersonat|data export|disconnect|embedded signup/i,
    );
  });
});
