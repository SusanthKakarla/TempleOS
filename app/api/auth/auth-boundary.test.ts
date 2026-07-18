import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("tenant auth boundary", () => {
  it("keeps tenant session exchange off legacy admin_users", () => {
    const source = readFileSync(path.join(process.cwd(), "app/api/auth/session/route.ts"), "utf8");

    expect(source).not.toMatch(/admin-users|admin_users|findActiveAdminByPhone|setAdminFirebaseUid/);
  });
});
