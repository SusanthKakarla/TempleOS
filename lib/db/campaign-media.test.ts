import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { getPool } from "./pool";
import { listCampaignGallery, replaceCampaignGallery } from "./campaign-media";

vi.mock("./pool", () => ({ getPool: vi.fn() }));

describe("listCampaignGallery", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("scopes by tenant through the campaign as well as the media row, and returns admin order", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await listCampaignGallery("tenant-1", "campaign-1");

    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("c.tenant_id = $2");
    expect(String(sql)).toContain("nm.tenant_id = $2");
    expect(String(sql)).toContain("ORDER BY cm.position ASC");
    expect(params).toEqual(["campaign-1", "tenant-1"]);
  });

  it("maps rows to the shared NotificationMedia shape", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "media-1",
          tenant_id: "tenant-1",
          category: "campaign_banner",
          title: "Before",
          storage_key: "key-1",
          image_url: "https://ik.imagekit.io/x/before.jpg",
          mime_type: "image/jpeg",
          width: 1200,
          height: 800,
          file_size: 4096,
          created_by: null,
          created_at: new Date("2026-08-01T00:00:00.000Z"),
          updated_at: new Date("2026-08-01T00:00:00.000Z"),
        },
      ],
    });

    const [image] = await listCampaignGallery("tenant-1", "campaign-1");

    expect(image).toMatchObject({
      id: "media-1",
      imageUrl: "https://ik.imagekit.io/x/before.jpg",
      title: "Before",
      width: 1200,
      height: 800,
    });
  });
});

describe("replaceCampaignGallery", () => {
  const query = vi.fn();
  const release = vi.fn();
  const connect = vi.fn();

  beforeEach(() => {
    query.mockReset();
    release.mockReset();
    connect.mockReset().mockResolvedValue({ query, release });
    (getPool as unknown as Mock).mockReturnValue({ connect });
  });

  function sqlCalls(): string[] {
    return query.mock.calls.map(([sql]) => String(sql));
  }

  it("refuses to touch a campaign belonging to another tenant", async () => {
    query.mockResolvedValueOnce({ rows: [] }); // BEGIN
    query.mockResolvedValueOnce({ rows: [] }); // ownership check finds nothing

    await replaceCampaignGallery("tenant-2", "campaign-of-tenant-1", ["media-1"]);

    expect(sqlCalls().some((sql) => sql.includes("ROLLBACK"))).toBe(true);
    expect(sqlCalls().some((sql) => sql.includes("INSERT INTO campaign_media"))).toBe(false);
    expect(release).toHaveBeenCalled();
  });

  it("replaces the gallery in one transaction, preserving array order as display position", async () => {
    query.mockResolvedValue({ rows: [{ id: "campaign-1" }] });

    await replaceCampaignGallery("tenant-1", "campaign-1", ["media-2", "media-1"]);

    const calls = sqlCalls();
    expect(calls[0]).toContain("BEGIN");
    expect(calls.some((sql) => sql.includes("DELETE FROM campaign_media"))).toBe(true);

    const insert = query.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO campaign_media"));
    expect(insert).toBeDefined();
    expect(String(insert![0])).toContain("WITH ORDINALITY");
    // The media subselect is tenant-scoped, so another temple's image id can't be attached.
    expect(String(insert![0])).toContain("nm.tenant_id = $3");
    expect(insert![1]).toEqual(["campaign-1", ["media-2", "media-1"], "tenant-1"]);
    expect(calls.some((sql) => sql.includes("COMMIT"))).toBe(true);
  });

  it("clears the gallery without inserting when given an empty list", async () => {
    query.mockResolvedValue({ rows: [{ id: "campaign-1" }] });

    await replaceCampaignGallery("tenant-1", "campaign-1", []);

    expect(sqlCalls().some((sql) => sql.includes("DELETE FROM campaign_media"))).toBe(true);
    expect(sqlCalls().some((sql) => sql.includes("INSERT INTO campaign_media"))).toBe(false);
    expect(sqlCalls().some((sql) => sql.includes("COMMIT"))).toBe(true);
  });

  it("rolls back and releases the connection when a statement fails", async () => {
    query.mockResolvedValueOnce({ rows: [] }); // BEGIN
    query.mockResolvedValueOnce({ rows: [{ id: "campaign-1" }] }); // ownership
    query.mockRejectedValueOnce(new Error("delete blew up"));
    query.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    await expect(replaceCampaignGallery("tenant-1", "campaign-1", ["media-1"])).rejects.toThrow("delete blew up");

    expect(sqlCalls().some((sql) => sql.includes("ROLLBACK"))).toBe(true);
    expect(release).toHaveBeenCalled();
  });
});
