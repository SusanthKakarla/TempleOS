import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const tenantDashboardApiRoutes = [
  "app/api/events/route.ts",
  "app/api/events/[id]/route.ts",
  "app/api/events/[id]/announce/route.ts",
  "app/api/devotees/route.ts",
  "app/api/devotees/[id]/route.ts",
  "app/api/devotees/[id]/donations/route.ts",
  "app/api/donations/route.ts",
  "app/api/donations/[id]/route.ts",
  "app/api/tenant/route.ts",
  "app/api/temple-special-days/route.ts",
  "app/api/temple-special-days/[id]/route.ts",
  "app/api/temple-sevas/route.ts",
  "app/api/temple-sevas/[id]/route.ts",
  "app/api/temple-faqs/route.ts",
  "app/api/temple-faqs/[id]/route.ts",
  "app/api/temple-social-links/[platform]/route.ts",
  "app/api/users/route.ts",
  "app/api/users/[membershipId]/roles/route.ts",
  "app/api/users/[membershipId]/status/route.ts",
  "app/api/users/[membershipId]/activity/route.ts",
  "app/api/users/export/route.ts",
  "app/api/users/import/preview/route.ts",
  "app/api/users/import/commit/route.ts",
  "app/api/users/import/template/route.ts",
  "app/api/audit-log/route.ts",
];

const tenantDashboardAuthBoundaryFiles = [
  "lib/auth/tenant-admin.ts",
  "app/(dashboard)/dashboard/require-dashboard-admin.ts",
  ...tenantDashboardApiRoutes,
];

const tenantDashboardPages = [
  "app/(dashboard)/layout.tsx",
  "app/(dashboard)/dashboard/page.tsx",
  "app/(dashboard)/dashboard/events/page.tsx",
  "app/(dashboard)/dashboard/devotees/page.tsx",
  "app/(dashboard)/dashboard/devotees/[id]/page.tsx",
  "app/(dashboard)/dashboard/donations/page.tsx",
  "app/(dashboard)/dashboard/whatsapp-activity/page.tsx",
  "app/(dashboard)/dashboard/chatbot-settings/page.tsx",
  "app/(dashboard)/dashboard/users/page.tsx",
  "app/(dashboard)/dashboard/users/import/page.tsx",
  "app/(dashboard)/dashboard/users/activity/page.tsx",
  "app/(dashboard)/dashboard/roles/page.tsx",
];

describe("tenant dashboard API authorization boundary", () => {
  it("uses tenant admin auth instead of raw tenant sessions or super-admin fallback", () => {
    for (const route of tenantDashboardApiRoutes) {
      const source = readFileSync(path.join(process.cwd(), route), "utf8");

      expect(source, route).toMatch(/@\/lib\/auth\/tenant-admin/);
      expect(source, route).not.toMatch(/getSessionAdmin/);
      expect(source, route).not.toMatch(/requireSuperAdmin|getSuperAdminSession|templeos_super_admin_session/);
    }
  });

  it("keeps tenant admin helpers free of super-admin fallback", () => {
    for (const route of tenantDashboardAuthBoundaryFiles) {
      const source = readFileSync(path.join(process.cwd(), route), "utf8");

      expect(source, route).not.toMatch(/requireSuperAdmin|getSuperAdminSession|templeos_super_admin_session/);
    }
  });

  it("uses tenant admin auth on dashboard server pages that read tenant data", () => {
    for (const route of tenantDashboardPages) {
      const source = readFileSync(path.join(process.cwd(), route), "utf8");

      expect(source, route).toMatch(/requireDashboardAdmin|@\/lib\/auth\/tenant-admin/);
      expect(source, route).not.toMatch(/getSessionAdmin/);
    }
  });

  it("does not read client-supplied tenant ids in representative dashboard APIs", () => {
    for (const route of ["app/api/events/route.ts", "app/api/tenant/route.ts"]) {
      const source = readFileSync(path.join(process.cwd(), route), "utf8");

      expect(source, route).not.toMatch(/searchParams\.get\(["']tenantId["']\)/);
      expect(source, route).not.toMatch(/parsed\.data\.tenantId|json\.tenantId|body\.tenantId/);
    }
  });
});
