import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { deactivateDevotees } from "./devotees";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

describe("deactivateDevotees", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("returns 0 without touching the pool when given no ids", async () => {
    const count = await deactivateDevotees("tenant-1", []);
    expect(count).toBe(0);
    expect(getPool).not.toHaveBeenCalled();
  });

  it("deactivates every given id in one query and returns how many were affected", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: "d1" }, { id: "d2" }] });

    const count = await deactivateDevotees("tenant-1", ["d1", "d2", "d3"]);

    expect(count).toBe(2);
    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("UPDATE devotees SET is_active = false");
    expect(String(sql)).toContain("id = ANY($2::uuid[])");
    expect(params).toEqual(["tenant-1", ["d1", "d2", "d3"]]);
  });
});
