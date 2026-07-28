import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { enqueueTempleAnnouncement } from "./manual-broadcasts";

vi.mock("./pool", () => ({ getPool: vi.fn() }));

describe("enqueueTempleAnnouncement", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset().mockResolvedValue({ rows: [{ id: "notif-1" }, { id: "notif-2" }] });
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("inserts one notification per WhatsApp-opted-in, active devotee with the admin's own message", async () => {
    const ids = await enqueueTempleAnnouncement("tenant-1", "Temple closed tomorrow for cleaning.");

    expect(ids).toEqual(["notif-1", "notif-2"]);
    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("whatsapp_opt_in_status = true");
    expect(String(sql)).toContain("is_active = true");
    expect(String(sql)).toContain("'temple_announcement'");
    expect(String(sql)).toContain("'announcement'");
    expect(params).toEqual(["tenant-1", "Temple closed tomorrow for cleaning."]);
  });

  it("returns an empty array when no devotee is eligible", async () => {
    query.mockResolvedValue({ rows: [] });
    const ids = await enqueueTempleAnnouncement("tenant-1", "Hello");
    expect(ids).toEqual([]);
  });
});
