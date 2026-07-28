import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { randomBytes } from "node:crypto";
import { getPool } from "./pool";
import { encryptSecret } from "@/lib/payments/crypto";
import { connectPaymentAccountForSuperAdmin, getDecryptedCredentialsForAccount } from "./tenant-payment-accounts";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

describe("getDecryptedCredentialsForAccount", () => {
  const ORIGINAL_KEY = process.env.PAYMENT_ENCRYPTION_KEY;
  const query = vi.fn();

  beforeEach(() => {
    process.env.PAYMENT_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  afterEach(() => {
    process.env.PAYMENT_ENCRYPTION_KEY = ORIGINAL_KEY;
  });

  it("returns null when no credentials row exists for the account", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await getDecryptedCredentialsForAccount("acct-missing")).toBeNull();
  });

  it("returns the api_key variant when key_id/encrypted_key_secret columns are populated", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          key_id: "rzp_test_123",
          encrypted_key_secret: encryptSecret("super-secret"),
          encrypted_webhook_secret: encryptSecret("webhook-secret"),
          encrypted_access_token: null,
          encrypted_refresh_token: null,
          access_token_expires_at: null,
          public_token: null,
        },
      ],
    });

    const creds = await getDecryptedCredentialsForAccount("acct-manual");
    expect(creds).toEqual({
      mode: "api_key",
      keyId: "rzp_test_123",
      keySecret: "super-secret",
      webhookSecret: "webhook-secret",
    });
  });

  it("returns the oauth variant when encrypted_access_token/refresh_token columns are populated", async () => {
    const expiresAt = new Date("2026-06-01T00:00:00.000Z");
    query.mockResolvedValueOnce({
      rows: [
        {
          key_id: null,
          encrypted_key_secret: null,
          encrypted_webhook_secret: null,
          encrypted_access_token: encryptSecret("access-token-value"),
          encrypted_refresh_token: encryptSecret("refresh-token-value"),
          access_token_expires_at: expiresAt,
          public_token: "rzp_public_token",
        },
      ],
    });

    const creds = await getDecryptedCredentialsForAccount("acct-partner");
    expect(creds).toEqual({
      mode: "oauth",
      accessToken: "access-token-value",
      refreshToken: "refresh-token-value",
      accessTokenExpiresAt: expiresAt.toISOString(),
      publicToken: "rzp_public_token",
      webhookSecret: null,
    });
  });
});

describe("connectPaymentAccountForSuperAdmin", () => {
  const ORIGINAL_KEY = process.env.PAYMENT_ENCRYPTION_KEY;
  const client = { query: vi.fn(), release: vi.fn() };
  const accountRow = {
    id: "acct-1",
    tenant_id: "tenant-1",
    provider_key: "razorpay",
    connection_method: "manual",
    razorpay_account_id: null,
    status: "connected",
    is_active: true,
    last_validated_at: null,
    last_validation_error: null,
    created_at: new Date("2026-01-01T00:00:00Z"),
    updated_at: new Date("2026-01-01T00:00:00Z"),
  };

  beforeEach(() => {
    process.env.PAYMENT_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    client.query.mockReset();
    client.release.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ connect: vi.fn().mockResolvedValue(client) });
  });

  afterEach(() => {
    process.env.PAYMENT_ENCRYPTION_KEY = ORIGINAL_KEY;
  });

  it("deactivates any prior active account, then inserts a fresh manual row, inside one transaction", async () => {
    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce(undefined) // deactivate
      .mockResolvedValueOnce({ rows: [accountRow] }) // insert tenant_payment_accounts
      .mockResolvedValueOnce(undefined) // insert tenant_payment_credentials
      .mockResolvedValueOnce(undefined); // COMMIT

    const account = await connectPaymentAccountForSuperAdmin("tenant-1", {
      providerKey: "razorpay",
      keyId: "rzp_test_abc123",
      keySecret: "a-secret",
      webhookSecret: "a-webhook-secret",
    });

    expect(account.id).toBe("acct-1");
    expect(String(client.query.mock.calls[0][0])).toBe("BEGIN");
    expect(String(client.query.mock.calls[1][0])).toContain("is_active = false");
    expect(client.query.mock.calls[1][1]).toEqual(["tenant-1"]);
    expect(String(client.query.mock.calls[4][0])).toBe("COMMIT");
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("rolls back and rethrows when the insert fails", async () => {
    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce(undefined) // deactivate
      .mockRejectedValueOnce(new Error("insert failed")); // insert tenant_payment_accounts

    await expect(
      connectPaymentAccountForSuperAdmin("tenant-1", {
        providerKey: "razorpay",
        keyId: "rzp_test_abc123",
        keySecret: "a-secret",
        webhookSecret: null,
      }),
    ).rejects.toThrow("insert failed");

    expect(String(client.query.mock.calls.at(-1)?.[0])).toBe("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });
});
