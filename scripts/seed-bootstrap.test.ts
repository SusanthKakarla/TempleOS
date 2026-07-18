import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("Story 1.2 production bootstrap scripts", () => {
  it("exposes seed:super-admin as the explicit platform bootstrap command", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts["seed:super-admin"]).toBe("node scripts/seed-super-admin.mjs");
  });

  it("keeps production seed paths off admin_users and getPilotTenant", () => {
    for (const file of ["scripts/seed.mts", "scripts/seed-super-admin.mjs"]) {
      const source = read(file);
      expect(source).not.toMatch(/admin_users|admin-users|upsertAdminUser/);
      expect(source).not.toMatch(/getPilotTenant/);
      expect(source).not.toMatch(/tenant_memberships|tenant_membership_roles/);
    }
  });

  it("documents the real first super admin as CLI or env seed input, not hardcoded SQL", () => {
    const source = read("scripts/seed-super-admin.mjs");
    expect(source).toContain("SUPER_ADMIN_PHONE_NUMBER");
    expect(source).toContain("SUPER_ADMIN_DISPLAY_NAME");
    expect(source).not.toContain("+917995362200");
  });
});
