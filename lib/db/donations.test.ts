import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { countDonationsFiltered, listDonations } from "./donations";

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
