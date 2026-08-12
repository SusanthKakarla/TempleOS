import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { getPool } from "./pool";
import { getTenantWebsite, resolveWebsiteByHostname, upsertTenantWebsite } from "./tenant-websites";

vi.mock("./pool", () => ({ getPool: vi.fn() }));

const query = vi.fn();

beforeEach(() => {
  query.mockReset();
  (getPool as unknown as Mock).mockReturnValue({ query });
});

function websiteRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "web-1",
    tenant_id: "tenant-1",
    enabled: true,
    hero_template: "classic",
    theme: "saffron",
    display_name: "Sri Uma Temple",
    deity_name: "Ramalingeswara",
    hero_title: null,
    hero_subtitle: null,
    story: null,
    about_content: null,
    seo_title: null,
    seo_description: null,
    deity_media_id: null,
    hero_media_id: null,
    logo_media_id: null,
    og_media_id: null,
    languages: ["en", "te"],
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-02T00:00:00.000Z"),
    t_id: "tenant-1",
    t_slug: "sivatemple",
    t_name: "Sri Uma Ramalingeswara Swamy Temple",
    t_status: "active",
    default_contact_phone: "+919000000000",
    address: "Vijayawada",
    timezone: "Asia/Kolkata",
    welcome_message: null,
    description: null,
    history: null,
    contact_email: null,
    google_maps_link: null,
    morning_open: "06:00:00",
    morning_close: "12:00:00",
    evening_open: null,
    evening_close: null,
    donation_info: null,
    notify_on_new_event: false,
    notify_on_event_updated: false,
    notify_on_event_cancelled: false,
    t_created_at: new Date("2026-01-01T00:00:00.000Z"),
    t_updated_at: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("resolveWebsiteByHostname — tenant isolation", () => {
  it("derives the tenant from the hostname alone, and only from its active primary domain on an active tenant", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await resolveWebsiteByHostname("sivatemple.trytempleos.com");

    const [sql, params] = query.mock.calls[0];
    const text = String(sql);
    expect(text).toContain("d.hostname = $1");
    // The tenant's own subdomain — the same host its admin portal answers on.
    expect(text).toContain("d.kind = 'primary'");
    expect(text).toContain("d.status = 'active'");
    expect(text).toContain("t.status = 'active'");
    // No tenant id can enter this query from anywhere but the hostname.
    expect(params).toEqual(["sivatemple.trytempleos.com"]);
    expect(params).toHaveLength(1);
  });

  it("normalises the hostname so casing or stray whitespace cannot bypass the match", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await resolveWebsiteByHostname("  SivaTemple.TryTempleOS.com ");
    expect(query.mock.calls[0][1]).toEqual(["sivatemple.trytempleos.com"]);
  });

  it("returns null for an unknown host without disclosing why", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await resolveWebsiteByHostname("nope.trytempleos.com")).toBeNull();
  });

  it("maps the temple and its website config together, so a page never has to look the tenant up again", async () => {
    query.mockResolvedValueOnce({ rows: [websiteRow()] });

    const resolved = await resolveWebsiteByHostname("sivatemple.trytempleos.com");

    expect(resolved?.tenant).toMatchObject({ id: "tenant-1", slug: "sivatemple", timezone: "Asia/Kolkata" });
    expect(resolved?.website).toMatchObject({ enabled: true, heroTemplate: "classic", languages: ["en", "te"] });
  });

  it("still resolves a DISABLED website, so the caller can say 'coming soon' rather than 'not found'", async () => {
    query.mockResolvedValueOnce({ rows: [websiteRow({ enabled: false })] });

    const resolved = await resolveWebsiteByHostname("sivatemple.trytempleos.com");

    expect(resolved).not.toBeNull();
    expect(resolved?.website.enabled).toBe(false);
  });

  it("drops any language value the app doesn't actually ship", async () => {
    query.mockResolvedValueOnce({ rows: [websiteRow({ languages: ["en", "fr", "te"] })] });
    const resolved = await resolveWebsiteByHostname("sivatemple.trytempleos.com");
    expect(resolved?.website.languages).toEqual(["en", "te"]);
  });

  it("resolves each temple strictly from its own hostname, so one site can never render another's data", async () => {
    query.mockResolvedValueOnce({ rows: [websiteRow()] });
    query.mockResolvedValueOnce({
      rows: [websiteRow({ t_id: "tenant-2", t_slug: "lalitha", t_name: "Lalitha Temple", tenant_id: "tenant-2" })],
    });

    const siva = await resolveWebsiteByHostname("sivatemple.trytempleos.com");
    const lalitha = await resolveWebsiteByHostname("lalitha.trytempleos.com");

    expect(siva?.tenant.id).toBe("tenant-1");
    expect(lalitha?.tenant.id).toBe("tenant-2");
    expect(query.mock.calls[0][1]).toEqual(["sivatemple.trytempleos.com"]);
    expect(query.mock.calls[1][1]).toEqual(["lalitha.trytempleos.com"]);
  });
});

describe("getTenantWebsite", () => {
  it("is scoped to the tenant id", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await getTenantWebsite("tenant-1")).toBeNull();
    expect(query.mock.calls[0][1]).toEqual(["tenant-1"]);
  });
});

describe("upsertTenantWebsite", () => {
  it("creates the row on first save and updates it thereafter, in one statement", async () => {
    query.mockResolvedValueOnce({ rows: [websiteRow()] });

    await upsertTenantWebsite("tenant-1", { enabled: true, heroTemplate: "divine" });

    const [sql, params] = query.mock.calls[0];
    const text = String(sql);
    expect(text).toContain("INSERT INTO tenant_websites");
    expect(text).toContain("ON CONFLICT (tenant_id) DO UPDATE");
    expect(params).toEqual(["tenant-1", true, "divine"]);
  });

  it("writes only the fields supplied, so a partial save can't blank what it didn't show", async () => {
    query.mockResolvedValueOnce({ rows: [websiteRow()] });

    await upsertTenantWebsite("tenant-1", { story: "Built in 1801." });

    const [sql, params] = query.mock.calls[0];
    expect(String(sql)).toContain("story = $2");
    // Only the SET clause matters here — every column still appears in RETURNING.
    const setClause = String(sql).slice(String(sql).indexOf("DO UPDATE SET"), String(sql).indexOf("RETURNING"));
    expect(setClause).not.toContain("hero_title");
    expect(setClause).not.toContain("enabled =");
    expect(params).toEqual(["tenant-1", "Built in 1801."]);
  });

  it("distinguishes clearing a field from omitting it", async () => {
    query.mockResolvedValueOnce({ rows: [websiteRow()] });

    await upsertTenantWebsite("tenant-1", { deityMediaId: null });

    expect(String(query.mock.calls[0][0])).toContain("deity_media_id = $2");
    expect(query.mock.calls[0][1]).toEqual(["tenant-1", null]);
  });
});
