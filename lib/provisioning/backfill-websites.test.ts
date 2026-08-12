import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { getPool } from "@/lib/db/pool";
import { backfillTenantWebsites } from "./backfill-websites";
import { WEBSITE_DOMAIN } from "@/lib/site/website-host";

vi.mock("@/lib/db/pool", () => ({ getPool: vi.fn() }));

const query = vi.fn();

beforeEach(() => {
  query.mockReset();
  (getPool as unknown as Mock).mockReturnValue({ query });
});

function tenantRow(slug: string, overrides: Partial<{ has_website: boolean; has_domain: boolean }> = {}) {
  return { id: `id-${slug}`, slug, name: `${slug} temple`, has_website: false, has_domain: false, ...overrides };
}

/** Statements after the initial tenant scan. */
function writes() {
  return query.mock.calls.slice(1).map(([sql, params]) => ({ sql: String(sql), params }));
}

describe("backfillTenantWebsites", () => {
  it("creates a disabled website row and a website-kind domain for a temple that has neither", async () => {
    query.mockResolvedValueOnce({ rows: [tenantRow("sivatemple")] });
    query.mockResolvedValueOnce({ rowCount: 1 }); // website insert
    query.mockResolvedValueOnce({ rows: [] }); // hostname free
    query.mockResolvedValueOnce({ rowCount: 1 }); // domain insert

    const result = await backfillTenantWebsites();

    expect(result).toMatchObject({ scanned: 1, websitesCreated: 1, domainsCreated: 1, skipped: [] });

    const [websiteInsert, , domainInsert] = writes();
    expect(websiteInsert.sql).toContain("INSERT INTO tenant_websites");
    // Disabled, exactly like provisioning: a subdomain resolves, nothing is published.
    expect(websiteInsert.params).toEqual(["id-sivatemple", "sivatemple temple"]);
    expect(websiteInsert.sql).toContain("false");
    expect(domainInsert.sql).toContain("'website', 'active'");
    expect(domainInsert.params).toEqual(["id-sivatemple", `sivatemple.${WEBSITE_DOMAIN}`]);
  });

  it("is idempotent — a second run over already-backfilled temples writes nothing", async () => {
    query.mockResolvedValueOnce({ rows: [tenantRow("sivatemple", { has_website: true, has_domain: true })] });

    const result = await backfillTenantWebsites();

    expect(result).toMatchObject({ scanned: 1, websitesCreated: 0, domainsCreated: 0 });
    expect(writes()).toHaveLength(0);
  });

  it("never edits an existing website configuration, even mid-run", async () => {
    query.mockResolvedValueOnce({ rows: [tenantRow("sivatemple")] });
    query.mockResolvedValueOnce({ rowCount: 0 }); // ON CONFLICT DO NOTHING — a row appeared concurrently
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rowCount: 1 });

    const result = await backfillTenantWebsites();

    expect(result.websitesCreated).toBe(0);
    const [websiteInsert] = writes();
    expect(websiteInsert.sql).toContain("ON CONFLICT (tenant_id) DO NOTHING");
    expect(websiteInsert.sql).not.toContain("DO UPDATE");
  });

  it("fills only the missing half when a temple already has one of the two", async () => {
    query.mockResolvedValueOnce({ rows: [tenantRow("sivatemple", { has_website: true })] });
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rowCount: 1 });

    const result = await backfillTenantWebsites();

    expect(result).toMatchObject({ websitesCreated: 0, domainsCreated: 1 });
    expect(writes().some((write) => write.sql.includes("INSERT INTO tenant_websites"))).toBe(false);
  });

  it("never touches admin ('primary') domains", async () => {
    query.mockResolvedValueOnce({ rows: [tenantRow("sivatemple")] });
    query.mockResolvedValueOnce({ rowCount: 1 });
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rowCount: 1 });

    await backfillTenantWebsites();

    for (const write of writes()) {
      expect(write.sql).not.toContain("UPDATE tenant_domains");
      expect(write.sql).not.toContain("DELETE FROM tenant_domains");
      expect(write.sql).not.toContain("'primary'");
    }
  });

  it("refuses to take a hostname that already belongs to another tenant", async () => {
    query.mockResolvedValueOnce({ rows: [tenantRow("sivatemple")] });
    query.mockResolvedValueOnce({ rowCount: 1 });
    query.mockResolvedValueOnce({ rows: [{ tenant_id: "someone-else" }] });

    const result = await backfillTenantWebsites();

    expect(result.domainsCreated).toBe(0);
    expect(result.skipped[0]).toMatchObject({ slug: "sivatemple" });
    expect(writes().some((write) => write.sql.includes("INSERT INTO tenant_domains"))).toBe(false);
  });

  it("skips a slug that cannot form a hostname instead of writing a broken domain", async () => {
    query.mockResolvedValueOnce({ rows: [tenantRow("not a host")] });

    const result = await backfillTenantWebsites();

    expect(result).toMatchObject({ websitesCreated: 0, domainsCreated: 0 });
    expect(result.skipped[0].reason).toContain("hostname");
    expect(writes()).toHaveLength(0);
  });

  it("only considers active tenants, so a suspended temple gets no public site", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await backfillTenantWebsites();
    expect(String(query.mock.calls[0][0])).toContain("t.status = 'active'");
  });

  it("reports what it would do without writing anything in dry-run", async () => {
    query.mockResolvedValueOnce({ rows: [tenantRow("a"), tenantRow("b", { has_website: true, has_domain: true })] });
    query.mockResolvedValueOnce({ rows: [] }); // hostname availability is still checked, so conflicts get reported

    const result = await backfillTenantWebsites({ dryRun: true });

    expect(result).toMatchObject({ scanned: 2, websitesCreated: 1, domainsCreated: 1 });
    // Reads are fine in a dry run; writes are not.
    expect(writes().some((write) => write.sql.includes("INSERT"))).toBe(false);
  });
});
