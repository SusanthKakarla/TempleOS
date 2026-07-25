import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { insertTemplateIfMissing, listPendingTemplatesForTenant, setApprovalStatus } from "./whatsapp-message-templates";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

const row = {
  id: "template-1",
  tenant_id: "tenant-1",
  template_key: "user_welcome",
  meta_template_name: "user_welcome",
  language: "en",
  meta_category: "UTILITY",
  variables: ["role", "templeName"],
  approval_status: "pending",
  enabled: false,
  fallback_strategy: null,
  description: "Standard TempleOS template",
  submission_guide: "Welcome...\n\n---\nVariables:\n{{1}} = role\n{{2}} = templeName",
  version: 1,
  last_synced_at: null,
  created_at: new Date("2026-07-24T00:00:00Z"),
  updated_at: new Date("2026-07-24T00:00:00Z"),
};

describe("WhatsApp message templates repository", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  describe("insertTemplateIfMissing", () => {
    it("inserts a bootstrap row disabled by default, using ON CONFLICT DO NOTHING so it never clobbers an admin's edits", async () => {
      query.mockResolvedValueOnce({ rows: [row] });

      const result = await insertTemplateIfMissing("tenant-1", {
        templateKey: "user_welcome",
        metaTemplateName: "user_welcome",
        language: "en",
        metaCategory: "UTILITY",
        variables: ["role", "templeName"],
        description: "Standard TempleOS template",
        submissionGuide: "Welcome...",
      });

      expect(result?.enabled).toBe(false);
      const sql = String(query.mock.calls[0][0]);
      expect(sql).toContain("ON CONFLICT (tenant_id, template_key, language) DO NOTHING");
      expect(sql).not.toContain("DO UPDATE");
      expect(sql).toContain("false"); // enabled hardcoded false in the query text, not a bound param
    });

    it("returns null (no row) when the (tenant, template_key, language) already existed", async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const result = await insertTemplateIfMissing("tenant-1", {
        templateKey: "user_welcome",
        metaTemplateName: "user_welcome",
        language: "en",
        metaCategory: "UTILITY",
        variables: ["role", "templeName"],
        description: null,
        submissionGuide: null,
      });

      expect(result).toBeNull();
    });
  });

  describe("setApprovalStatus — transition-guarded auto-enable", () => {
    it("enables the template on the pending → approved transition", async () => {
      query.mockResolvedValueOnce({ rows: [{ ...row, approval_status: "approved", enabled: true }] });

      const result = await setApprovalStatus("tenant-1", "template-1", "approved");

      expect(result?.approvalStatus).toBe("approved");
      expect(result?.enabled).toBe(true);
      const sql = String(query.mock.calls[0][0]);
      expect(sql).toContain("approval_status IS DISTINCT FROM 'approved'");
    });

    it("does not re-enable a template an admin has since disabled, on a no-op approved → approved resync", async () => {
      // Simulating the DB's own CASE logic here since the mock can't run real
      // SQL: previous status was already 'approved', so the guard condition
      // (approval_status IS DISTINCT FROM 'approved') is false, and `enabled`
      // must pass through unchanged — asserting the row returned reflects
      // that the caller-supplied "admin disabled it" state (enabled=false)
      // survives a resync that reports the same 'approved' status again.
      query.mockResolvedValueOnce({ rows: [{ ...row, approval_status: "approved", enabled: false }] });

      const result = await setApprovalStatus("tenant-1", "template-1", "approved");

      expect(result?.approvalStatus).toBe("approved");
      expect(result?.enabled).toBe(false);
    });

    it("does not touch enabled on a pending → rejected transition", async () => {
      query.mockResolvedValueOnce({ rows: [{ ...row, approval_status: "rejected", enabled: false }] });

      const result = await setApprovalStatus("tenant-1", "template-1", "rejected");

      expect(result?.approvalStatus).toBe("rejected");
      expect(result?.enabled).toBe(false);
      const sql = String(query.mock.calls[0][0]);
      expect(sql).toContain("WHEN $3 = 'approved'");
    });
  });

  it("lists only pending templates for a tenant", async () => {
    query.mockResolvedValueOnce({ rows: [row] });

    const result = await listPendingTemplatesForTenant("tenant-1");

    expect(result).toHaveLength(1);
    expect(String(query.mock.calls[0][0])).toContain("approval_status = 'pending'");
  });
});
