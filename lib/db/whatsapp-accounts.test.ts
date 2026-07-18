import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { upsertWhatsAppAccount } from "./whatsapp-accounts";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

const row = {
  id: "whatsapp-1",
  tenant_id: "tenant-1",
  phone_number: "+919876543210",
  meta_phone_number_id: "meta-2",
  meta_business_account_id: "business-1",
  status: "connected",
  connected_at: new Date("2026-07-18T00:00:00Z"),
  created_at: new Date("2026-07-18T00:00:00Z"),
  updated_at: new Date("2026-07-18T00:00:00Z"),
};

describe("WhatsApp accounts repository", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("upserts manual setup by tenant so changing Meta IDs for the same tenant does not violate tenant uniqueness", async () => {
    query.mockResolvedValueOnce({ rows: [row] });

    const result = await upsertWhatsAppAccount("tenant-1", {
      phoneNumber: "+919876543210",
      metaPhoneNumberId: "meta-2",
      metaBusinessAccountId: "business-1",
    });

    expect(result.metaPhoneNumberId).toBe("meta-2");
    expect(String(query.mock.calls[0][0])).toContain("ON CONFLICT (tenant_id)");
    expect(String(query.mock.calls[0][0])).not.toContain("ON CONFLICT (meta_phone_number_id)");
  });
});
