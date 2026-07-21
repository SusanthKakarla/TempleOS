import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import {
  completeEmbeddedSignup,
  deleteWhatsAppAccount,
  disconnectWhatsAppAccount,
  manuallyConnectWhatsAppAccount,
} from "./whatsapp-accounts";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

const row = {
  id: "whatsapp-1",
  tenant_id: "tenant-1",
  phone_number: "+919876543210",
  meta_phone_number_id: "meta-2",
  meta_business_account_id: "business-1",
  business_name: null,
  phone_verification_status: null,
  webhook_subscribed: false,
  webhook_last_error_code: null,
  webhook_last_error_message: null,
  status: "connected",
  connected_at: new Date("2026-07-18T00:00:00Z"),
  disconnected_at: null,
  created_at: new Date("2026-07-18T00:00:00Z"),
  updated_at: new Date("2026-07-18T00:00:00Z"),
};

describe("WhatsApp accounts repository", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("manually connects (upserts) by tenant so changing Meta IDs for the same tenant does not violate tenant uniqueness", async () => {
    query.mockResolvedValueOnce({ rows: [row] });

    const result = await manuallyConnectWhatsAppAccount("tenant-1", {
      phoneNumber: "+919876543210",
      metaPhoneNumberId: "meta-2",
      metaBusinessAccountId: "business-1",
      webhookSubscribed: true,
    });

    expect(result.metaPhoneNumberId).toBe("meta-2");
    expect(String(query.mock.calls[0][0])).toContain("ON CONFLICT (tenant_id)");
    expect(String(query.mock.calls[0][0])).not.toContain("ON CONFLICT (meta_phone_number_id)");
    expect(query.mock.calls[0][1]).toContain(true);
  });

  it("persists Meta's real error code/message when the webhook subscribe call fails", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          ...row,
          webhook_subscribed: false,
          webhook_last_error_code: "#200 OAuthException",
          webhook_last_error_message: "Missing permissions",
        },
      ],
    });

    const result = await manuallyConnectWhatsAppAccount("tenant-1", {
      phoneNumber: "+919876543210",
      metaPhoneNumberId: "meta-2",
      metaBusinessAccountId: "business-1",
      webhookSubscribed: false,
      webhookLastErrorCode: "#200 OAuthException",
      webhookLastErrorMessage: "Missing permissions",
    });

    expect(result.webhookSubscribed).toBe(false);
    expect(result.webhookLastErrorCode).toBe("#200 OAuthException");
    expect(result.webhookLastErrorMessage).toBe("Missing permissions");
    expect(query.mock.calls[0][1]).toContain("Missing permissions");
  });

  it("completes embedded signup by tenant, upserting the Graph-fetched fields and clearing disconnectedAt", async () => {
    query.mockResolvedValueOnce({
      rows: [{ ...row, business_name: "Sri Temple", phone_verification_status: "VERIFIED", webhook_subscribed: true }],
    });

    const result = await completeEmbeddedSignup("tenant-1", {
      phoneNumber: "+919876543210",
      metaPhoneNumberId: "meta-2",
      metaBusinessAccountId: "business-1",
      businessName: "Sri Temple",
      phoneVerificationStatus: "VERIFIED",
      webhookSubscribed: true,
    });

    expect(result.businessName).toBe("Sri Temple");
    expect(result.webhookSubscribed).toBe(true);
    expect(String(query.mock.calls[0][0])).toContain("ON CONFLICT (tenant_id)");
    expect(String(query.mock.calls[0][0])).toContain("disconnected_at = NULL");
  });

  it("disconnects by tenant, flipping status and clearing webhook_subscribed without touching identifiers", async () => {
    query.mockResolvedValueOnce({
      rows: [{ ...row, status: "disconnected", disconnected_at: new Date("2026-07-19T00:00:00Z") }],
    });

    const result = await disconnectWhatsAppAccount("tenant-1");

    expect(result?.status).toBe("disconnected");
    expect(result?.metaPhoneNumberId).toBe("meta-2");
    expect(String(query.mock.calls[0][0])).toContain("SET status = 'disconnected'");
    expect(String(query.mock.calls[0][0])).toContain("webhook_subscribed = false");
  });

  it("returns null from disconnect when the tenant has no whatsapp account", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const result = await disconnectWhatsAppAccount("tenant-without-account");

    expect(result).toBeNull();
  });

  it("hard-deletes the account row by tenant", async () => {
    query.mockResolvedValueOnce({ rows: [row] });

    const result = await deleteWhatsAppAccount("tenant-1");

    expect(result?.id).toBe("whatsapp-1");
    expect(String(query.mock.calls[0][0])).toContain("DELETE FROM whatsapp_accounts");
  });

  it("returns null from delete when the tenant has no whatsapp account", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const result = await deleteWhatsAppAccount("tenant-without-account");

    expect(result).toBeNull();
  });
});
