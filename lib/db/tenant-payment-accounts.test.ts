import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { randomBytes } from "node:crypto";
import { getPool } from "./pool";
import { encryptSecret } from "@/lib/payments/crypto";
import { getDecryptedCredentialsForAccount } from "./tenant-payment-accounts";

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
