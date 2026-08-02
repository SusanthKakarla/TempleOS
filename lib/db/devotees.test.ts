import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { deactivateAllDevotees, deactivateDevotees, getDevoteeByPhone, listExistingPhones } from "./devotees";

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

describe("deactivateAllDevotees", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("deactivates every currently-active devotee for the tenant in one query", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: "d1" }, { id: "d2" }, { id: "d3" }] });

    const count = await deactivateAllDevotees("tenant-1");

    expect(count).toBe(3);
    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("UPDATE devotees SET is_active = false");
    expect(String(sql)).toContain("is_active = true");
    expect(params).toEqual(["tenant-1"]);
  });
});

describe("listExistingPhones", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockClear();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("returns an empty set without touching the pool when given no phones", async () => {
    const result = await listExistingPhones("tenant-1", []);
    expect(result).toEqual(new Set());
    expect(getPool).not.toHaveBeenCalled();
  });

  it("only counts active devotees as existing — a deactivated phone (e.g. after Delete All Devotees) must not block re-import", async () => {
    query.mockResolvedValueOnce({ rows: [{ whatsapp_phone: "+919876500000" }] });

    const result = await listExistingPhones("tenant-1", ["+919876500000", "+919876500001"]);

    expect(result).toEqual(new Set(["+919876500000"]));
    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("is_active = true");
    expect(params).toEqual(["tenant-1", ["+919876500000", "+919876500001"]]);
  });
});

describe("getDevoteeByPhone", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("prefers the active devotee and limits to one row when a phone is shared with a deactivated devotee", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await getDevoteeByPhone("tenant-1", "+919876500000");

    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("ORDER BY d.is_active DESC");
    expect(String(sql)).toContain("LIMIT 1");
    expect(params).toEqual(["tenant-1", "+919876500000"]);
  });
});
