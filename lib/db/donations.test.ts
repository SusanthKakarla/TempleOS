import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { countDonationsFiltered, deleteAllDonations, deleteDonations, listDonations } from "./donations";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

describe("donations purpose filter", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("adds a purpose condition and param to listDonations when purpose is set", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await listDonations("tenant-1", { purpose: "Seva" });

    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("d.purpose = $2");
    expect(params).toEqual(["tenant-1", "Seva"]);
  });

  it("omits the purpose condition when purpose is not set", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await listDonations("tenant-1", {});

    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).not.toContain("d.purpose");
    expect(params).toEqual(["tenant-1"]);
  });

  it("applies the same purpose condition in countDonationsFiltered", async () => {
    query.mockResolvedValueOnce({ rows: [{ count: "3" }] });

    const count = await countDonationsFiltered("tenant-1", { purpose: "Annadanam (Food Offering)" });

    expect(count).toBe(3);
    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("d.purpose = $2");
    expect(params).toEqual(["tenant-1", "Annadanam (Food Offering)"]);
  });
});

function createTransactionalClient(rowsBySql: Array<{ match: string; rows: unknown[] }> = []) {
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
  (getPool as unknown as Mock).mockReturnValue({ connect: vi.fn().mockResolvedValue(client) });
  return { client, queries };
}

describe("deleteDonations", () => {
  beforeEach(() => {
    (getPool as unknown as Mock).mockReset();
  });

  it("returns 0 without touching the pool when given no ids", async () => {
    const count = await deleteDonations("tenant-1", []);
    expect(count).toBe(0);
    expect(getPool).not.toHaveBeenCalled();
  });

  it("deletes all given ids in one transaction and recomputes each distinct affected devotee's cache once", async () => {
    const { queries } = createTransactionalClient([
      {
        match: "DELETE FROM donations",
        rows: [{ devotee_id: "devotee-1" }, { devotee_id: "devotee-1" }, { devotee_id: null }, { devotee_id: "devotee-2" }],
      },
    ]);

    const count = await deleteDonations("tenant-1", ["d1", "d2", "d3", "d4"]);

    expect(count).toBe(4);
    const sqls = queries.map((q) => q.sql);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls).toContainEqual(expect.stringContaining("DELETE FROM donations"));
    expect(queries.find((q) => q.sql.includes("DELETE FROM donations"))?.params).toEqual([
      "tenant-1",
      ["d1", "d2", "d3", "d4"],
    ]);
    // recomputeDevoteeDonationCache runs once per distinct non-null devotee_id, not once per row.
    const recomputeCalls = sqls.filter((sql) => sql.includes("UPDATE devotees SET"));
    expect(recomputeCalls).toHaveLength(2);
    expect(sqls.at(-1)).toBe("COMMIT");
  });

  it("rolls back and rethrows if the delete fails", async () => {
    (getPool as unknown as Mock).mockReturnValue({
      connect: vi.fn().mockResolvedValue({
        query: vi.fn(async (sql: string) => {
          if (sql === "BEGIN") return { rows: [] };
          throw new Error("boom");
        }),
        release: vi.fn(),
      }),
    });

    await expect(deleteDonations("tenant-1", ["d1"])).rejects.toThrow("boom");
  });
});

describe("deleteAllDonations", () => {
  beforeEach(() => {
    (getPool as unknown as Mock).mockReset();
  });

  it("deletes every donation for the tenant and zeroes out devotee donation caches in one transaction", async () => {
    const { queries } = createTransactionalClient([{ match: "DELETE FROM donations", rows: [{}, {}, {}] }]);

    const count = await deleteAllDonations("tenant-1");

    expect(count).toBe(3);
    const sqls = queries.map((q) => q.sql);
    expect(sqls[0]).toBe("BEGIN");
    const deleteQuery = queries.find((q) => q.sql.includes("DELETE FROM donations"));
    expect(deleteQuery?.sql).not.toContain("id = ANY");
    expect(deleteQuery?.params).toEqual(["tenant-1"]);
    expect(sqls).toContainEqual(expect.stringContaining("UPDATE devotees"));
    expect(sqls.at(-1)).toBe("COMMIT");
  });

  it("rolls back and rethrows if the delete fails", async () => {
    (getPool as unknown as Mock).mockReturnValue({
      connect: vi.fn().mockResolvedValue({
        query: vi.fn(async (sql: string) => {
          if (sql === "BEGIN") return { rows: [] };
          throw new Error("boom");
        }),
        release: vi.fn(),
      }),
    });

    await expect(deleteAllDonations("tenant-1")).rejects.toThrow("boom");
  });
});
