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
      expect(body, source).not.toMatch(/admin-users|admin_users|getPilotTenant/);
      expect(body, source).not.toMatch(/requireLegacyTenantSuperAdmin/);
    }
  });
});
