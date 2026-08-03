import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { countDevoteesFiltered, deactivateAllDevotees, deactivateDevotees, getDevoteeByPhone, listDevoteesSharingPhone } from "./devotees";

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

describe("listDevoteesSharingPhone", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockClear();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("finds every other active devotee sharing the same phone number, excluding the current one", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await listDevoteesSharingPhone("tenant-1", "+919876500000", "devotee-1");

    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("d.whatsapp_phone = $2");
    expect(String(sql)).toContain("d.id != $3");
    expect(String(sql)).toContain("d.is_active = true");
    expect(params).toEqual(["tenant-1", "+919876500000", "devotee-1"]);
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

describe("countDevoteesFiltered", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("counts only active devotees by default — the Dashboard's Total Devotees card relies on this to match the Devotees page", async () => {
    query.mockResolvedValueOnce({ rows: [{ count: "3" }] });

    const count = await countDevoteesFiltered("tenant-1", {});

    expect(count).toBe(3);
    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("d.is_active = true");
    expect(params).toEqual(["tenant-1"]);
  });

  it("includes inactive devotees only when explicitly requested", async () => {
    query.mockResolvedValueOnce({ rows: [{ count: "138" }] });

    const count = await countDevoteesFiltered("tenant-1", { includeInactive: true });

    expect(count).toBe(138);
    const [sql] = query.mock.calls[0];
    expect(String(sql)).not.toContain("d.is_active = true");
  });

  it("filters to devotees with a phone number when hasPhone is true", async () => {
    query.mockResolvedValueOnce({ rows: [{ count: "5" }] });

    await countDevoteesFiltered("tenant-1", { hasPhone: true });

    const [sql] = query.mock.calls[0];
    expect(String(sql)).toContain("d.whatsapp_phone IS NOT NULL");
  });

  it("filters to devotees without a phone number when hasPhone is false", async () => {
    query.mockResolvedValueOnce({ rows: [{ count: "2" }] });

    await countDevoteesFiltered("tenant-1", { hasPhone: false });

    const [sql] = query.mock.calls[0];
    expect(String(sql)).toContain("d.whatsapp_phone IS NULL");
  });
});
