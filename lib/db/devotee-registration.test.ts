import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerDevoteeWithFamilyIntent, DevoteeFamilyMoveConflictError } from "./devotee-registration";
import { getPool } from "./pool";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

function createClient(rowsBySql: Array<{ match: string; rows: unknown[] }> = []) {
  const queries: Array<{ sql: string; params?: unknown[] }> = [];
  const remainingRows = [...rowsBySql];
  const client = {
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      queries.push({ sql, params });
      const matchingIndex = remainingRows.findIndex((entry) => sql.includes(entry.match));
      const matching = matchingIndex >= 0 ? remainingRows.splice(matchingIndex, 1)[0] : undefined;
      return { rows: matching?.rows ?? [], rowCount: matching?.rows.length ?? 0 };
    }),
    release: vi.fn(),
  };
  vi.mocked(getPool).mockReturnValue({ connect: vi.fn().mockResolvedValue(client) } as never);
  return { client, queries };
}

describe("registerDevoteeWithFamilyIntent", () => {
  beforeEach(() => {
    vi.mocked(getPool).mockReset();
  });

  it("creates a no-family devotee in a transaction", async () => {
    const { queries } = createClient([{ match: "INSERT INTO devotees", rows: [{ id: "devotee-1" }] }]);

    const result = await registerDevoteeWithFamilyIntent("tenant-1", {
      devotee: { displayName: "Ravi Kumar", whatsappPhone: "+919876543210" },
      family: { mode: "none" },
    });

    expect(result).toEqual({ devoteeId: "devotee-1", familyId: null });
    expect(queries.map((q) => q.sql)).toEqual(
      expect.arrayContaining(["BEGIN", expect.stringContaining("INSERT INTO devotees"), "COMMIT"]),
    );
  });

  it("rejects moving an existing devotee from another family without explicit move intent", async () => {
    createClient([
      { match: "INSERT INTO devotees", rows: [{ id: "devotee-1" }] },
      { match: "INSERT INTO devotee_families", rows: [{ id: "family-2" }] },
      {
        match: "SELECT id, family_id FROM devotees",
        rows: [{ id: "devotee-1", family_id: "family-2" }],
      },
      {
        match: "SELECT id, family_id FROM devotees",
        rows: [{ id: "existing-1", family_id: "family-1" }],
      },
    ]);

    await expect(
      registerDevoteeWithFamilyIntent("tenant-1", {
        devotee: { displayName: "Ravi Kumar", whatsappPhone: "+919876543210" },
        family: {
          mode: "new",
          familyName: "Kumar Family",
          primaryRelationship: "head_of_family",
          members: [{ kind: "existing", devoteeId: "existing-1", relationship: "wife" }],
        },
      }),
    ).rejects.toBeInstanceOf(DevoteeFamilyMoveConflictError);
  });

  it("updates an existing selected devotee family_id and family_members when move intent is explicit", async () => {
    const { queries } = createClient([
      { match: "INSERT INTO devotees", rows: [{ id: "devotee-1" }] },
      { match: "INSERT INTO devotee_families", rows: [{ id: "family-2" }] },
      {
        match: "SELECT id, family_id FROM devotees",
        rows: [{ id: "devotee-1", family_id: "family-2" }],
      },
      {
        match: "SELECT id, family_id FROM devotees",
        rows: [{ id: "existing-1", family_id: "family-1" }],
      },
    ]);

    await registerDevoteeWithFamilyIntent("tenant-1", {
      devotee: { displayName: "Ravi Kumar", whatsappPhone: "+919876543210" },
      family: {
        mode: "new",
        familyName: "Kumar Family",
        primaryRelationship: "head_of_family",
        members: [
          {
            kind: "existing",
            devoteeId: "existing-1",
            relationship: "wife",
            moveFromExistingFamily: true,
          },
        ],
      },
    });

    expect(queries.some((q) => q.sql.includes("DELETE FROM family_members"))).toBe(true);
    expect(
      queries.some((q) => q.sql.includes("UPDATE devotees SET family_id = $2") && q.params?.[0] === "existing-1"),
    ).toBe(true);
    expect(queries.some((q) => q.sql.includes("INSERT INTO family_members"))).toBe(true);
  });
});
