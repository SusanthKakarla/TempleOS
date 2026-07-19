import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import {
  listRoleDefinitionsForSuperAdmin,
  seedV0RoleDefinitions,
  V0_ROLE_DEFINITIONS,
} from "./role-definitions";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

describe("V0 role definitions", () => {
  const query = vi.fn();
  const release = vi.fn();

  beforeEach(() => {
    query.mockReset();
    release.mockReset();
    query.mockResolvedValue({ rows: [] });
    (getPool as unknown as Mock).mockReturnValue({
      query,
      connect: vi.fn().mockResolvedValue({ query, release }),
    });
  });

  it("defines exactly the fixed V0 role catalog", () => {
    expect(V0_ROLE_DEFINITIONS.map((role) => role.code)).toEqual([
      "admin",
      "priest",
      "committee_member",
      "volunteer",
      "devotee",
    ]);
    expect(V0_ROLE_DEFINITIONS.every((role) => role.active)).toBe(true);
  });

  it("pins admin capabilities and keeps other V0 roles as markers", () => {
    expect(V0_ROLE_DEFINITIONS.find((role) => role.code === "admin")?.capabilitySet).toEqual({
      dashboardAccess: true,
      manageTenantMembers: true,
      manageTenantRoles: true,
      identityMarker: false,
      tenantRelationshipMarker: false,
    });

    for (const role of V0_ROLE_DEFINITIONS.filter((item) => item.code !== "admin")) {
      expect(role.capabilitySet).toMatchObject({
        dashboardAccess: false,
        manageTenantMembers: false,
        manageTenantRoles: false,
      });
    }
  });

  it("seeds roles idempotently by role code", async () => {
    query.mockImplementation((sql: string, params?: [string, string, string, string, boolean]) => {
      if (!sql.includes("INSERT INTO role_definitions") || !params) {
        return Promise.resolve({ rows: [] });
      }

      return Promise.resolve({
        rows: [
          {
            id: `role-${params[0]}`,
            code: params[0],
            display_name: params[1],
            description: params[2],
            capability_set: JSON.parse(params[3]) as Record<string, unknown>,
            active: params[4],
            created_at: new Date("2026-07-18T00:00:00Z"),
            updated_at: new Date("2026-07-18T00:00:00Z"),
          },
        ],
      });
    });

    await seedV0RoleDefinitions();

    expect(query).toHaveBeenCalledWith("BEGIN");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE code <> ALL"), [
      V0_ROLE_DEFINITIONS.map((role) => role.code),
    ]);
    expect(query).toHaveBeenCalledWith("COMMIT");
    expect(release).toHaveBeenCalledOnce();
    for (const role of V0_ROLE_DEFINITIONS) {
      expect(query).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT (code)"), [
        role.code,
        role.displayName,
        role.description,
        JSON.stringify(role.capabilitySet),
        role.active,
      ]);
    }
  });

  it("rolls back if any role seed fails", async () => {
    query.mockImplementation((sql: string, params?: [string]) => {
      if (sql.includes("INSERT INTO role_definitions") && params?.[0] === "committee_member") {
        return Promise.reject(new Error("write failed"));
      }
      return Promise.resolve({
        rows: [
          {
            id: `role-${params?.[0] ?? "ok"}`,
            code: params?.[0] ?? "ok",
            display_name: "Role",
            description: "Description",
            capability_set: {},
            active: true,
            created_at: new Date("2026-07-18T00:00:00Z"),
            updated_at: new Date("2026-07-18T00:00:00Z"),
          },
        ],
      });
    });

    await expect(seedV0RoleDefinitions()).rejects.toThrow("write failed");

    expect(query).toHaveBeenCalledWith("BEGIN");
    expect(query).toHaveBeenCalledWith("ROLLBACK");
    expect(query).not.toHaveBeenCalledWith("COMMIT");
    expect(release).toHaveBeenCalledOnce();
  });

  it("lists role definitions for super admin in fixed V0 role order", async () => {
    query.mockResolvedValue({
      rows: [
        roleRow("role-volunteer", "volunteer", "Volunteer", true),
        roleRow("role-admin", "admin", "Admin", true),
        roleRow("role-devotee", "devotee", "Devotee", false),
        roleRow("role-priest", "priest", "Priest", true),
        roleRow("role-committee", "committee_member", "Committee Member", true),
      ],
    });

    const roles = await listRoleDefinitionsForSuperAdmin();

    expect(query).toHaveBeenCalledWith(expect.stringContaining("FROM role_definitions"), [
      V0_ROLE_DEFINITIONS.map((role) => role.code),
    ]);
    expect(roles.map((role) => role.code)).toEqual([
      "admin",
      "priest",
      "committee_member",
      "volunteer",
      "devotee",
    ]);
    expect(roles[0]).toMatchObject({
      id: "role-admin",
      code: "admin",
      displayName: "Admin",
      active: true,
      capabilitySet: { dashboardAccess: true },
    });
    expect(roles[4]).toMatchObject({
      code: "devotee",
      active: false,
    });
  });

  it("fails closed when the fixed V0 catalog is incomplete", async () => {
    query.mockResolvedValue({
      rows: [
        roleRow("role-admin", "admin", "Admin", true),
        roleRow("role-priest", "priest", "Priest", true),
        roleRow("role-committee", "committee_member", "Committee Member", true),
        roleRow("role-volunteer", "volunteer", "Volunteer", true),
      ],
    });

    await expect(listRoleDefinitionsForSuperAdmin()).rejects.toThrow(
      "Role catalog is incomplete.",
    );
  });
});

function roleRow(id: string, code: string, displayName: string, active: boolean) {
  return {
    id,
    code,
    display_name: displayName,
    description: `${displayName} V0 meaning`,
    capability_set: { dashboardAccess: code === "admin" },
    active,
    created_at: new Date("2026-07-18T00:00:00Z"),
    updated_at: new Date("2026-07-18T00:00:00Z"),
  };
}
