import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { getPool } from "@/lib/db/pool";
import { backfillTenantWebsites } from "./backfill-websites";

vi.mock("@/lib/db/pool", () => ({ getPool: vi.fn() }));

const query = vi.fn();

beforeEach(() => {
  query.mockReset();
  (getPool as unknown as Mock).mockReturnValue({ query });
});

function tenantRow(slug: string, overrides: Partial<{ has_website: boolean }> = {}) {
  return { id: `id-${slug}`, slug, name: `${slug} temple`, has_website: false, ...overrides };
}

/** Statements after the initial tenant scan. */
function writes() {
  return query.mock.calls.slice(1).map(([sql, params]) => ({ sql: String(sql), params }));
}

describe("backfillTenantWebsites", () => {
  it("creates a disabled website row for a temple that has none", async () => {
    query.mockResolvedValueOnce({ rows: [tenantRow("sivatemple")] });
    query.mockResolvedValueOnce({ rowCount: 1 });

    const result = await backfillTenantWebsites();

    expect(result).toMatchObject({ scanned: 1, websitesCreated: 1, skipped: [] });

    const [websiteInsert] = writes();
    expect(websiteInsert.sql).toContain("INSERT INTO tenant_websites");
    // Disabled, exactly like provisioning: nothing is published until an admin says so.
    expect(websiteInsert.sql).toContain("false");
    expect(websiteInsert.params).toEqual(["id-sivatemple", "sivatemple temple"]);
  });

  it("creates no domain rows at all — the temple's subdomain already exists", async () => {
    query.mockResolvedValueOnce({ rows: [tenantRow("sivatemple")] });
    query.mockResolvedValueOnce({ rowCount: 1 });

    await backfillTenantWebsites();

    for (const write of writes()) {
      expect(write.sql).not.toContain("tenant_domains");
    }
  });

  it("never reads, writes or deletes tenant_domains, so no admin hostname can be disturbed", async () => {
    query.mockResolvedValueOnce({ rows: [tenantRow("sivatemple")] });
    query.mockResolvedValueOnce({ rowCount: 1 });

    await backfillTenantWebsites();

    for (const [sql] of query.mock.calls) {
      expect(String(sql)).not.toContain("tenant_domains");
    }
  });

  it("is idempotent — a second run over already-backfilled temples writes nothing", async () => {
    query.mockResolvedValueOnce({ rows: [tenantRow("sivatemple", { has_website: true })] });

    const result = await backfillTenantWebsites();

    expect(result).toMatchObject({ scanned: 1, websitesCreated: 0 });
    expect(writes()).toHaveLength(0);
  });

  it("never edits an existing website configuration, even mid-run", async () => {
    query.mockResolvedValueOnce({ rows: [tenantRow("sivatemple")] });
    query.mockResolvedValueOnce({ rowCount: 0 }); // ON CONFLICT DO NOTHING — a row appeared concurrently

    const result = await backfillTenantWebsites();

    expect(result.websitesCreated).toBe(0);
    const [websiteInsert] = writes();
    expect(websiteInsert.sql).toContain("ON CONFLICT (tenant_id) DO NOTHING");
    expect(websiteInsert.sql).not.toContain("DO UPDATE");
  });

  it("only considers active tenants, so a suspended temple gets no public site", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await backfillTenantWebsites();
    expect(String(query.mock.calls[0][0])).toContain("t.status = 'active'");
  });

  it("reports what it would do without writing anything in dry-run", async () => {
    query.mockResolvedValueOnce({ rows: [tenantRow("a"), tenantRow("b", { has_website: true })] });

    const result = await backfillTenantWebsites({ dryRun: true });

    expect(result).toMatchObject({ scanned: 2, websitesCreated: 1 });
    expect(writes()).toHaveLength(0);
  });
});
