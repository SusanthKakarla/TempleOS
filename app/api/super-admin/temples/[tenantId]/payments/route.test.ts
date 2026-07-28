import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT, DELETE } from "./route";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { getTenantById } from "@/lib/db/tenants";
import {
  connectPaymentAccountForSuperAdmin,
  disconnectPaymentAccount,
  getActivePaymentAccountForTenant,
} from "@/lib/db/tenant-payment-accounts";
import { validateCredentials } from "@/lib/payments/payment-provider-service";
import { PaymentAuditService } from "@/lib/payments/payment-audit";
import type { TenantPaymentAccount } from "@/types/db";

vi.mock("@/lib/auth/super-admin-session", () => ({
  requireSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/db/tenants", () => ({
  getTenantById: vi.fn(),
}));

vi.mock("@/lib/db/tenant-payment-accounts", () => ({
  connectPaymentAccountForSuperAdmin: vi.fn(),
  disconnectPaymentAccount: vi.fn(),
  getActivePaymentAccountForTenant: vi.fn(),
}));

vi.mock("@/lib/payments/payment-provider-service", () => ({
  validateCredentials: vi.fn(),
}));

vi.mock("@/lib/payments/payment-audit", () => ({
  PaymentAuditService: {
    accountConnectedBySuperAdmin: vi.fn(),
    accountDisconnectedBySuperAdmin: vi.fn(),
  },
}));

const superAdmin = {
  id: "super-admin-1",
  personId: "person-1",
  phoneNumber: "+14155552671",
  displayName: "Platform Admin",
  firebaseUid: "firebase-1",
  active: true,
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

const tenantId = "11111111-1111-4111-8111-111111111111";

const account: TenantPaymentAccount = {
  id: "account-1",
  tenantId,
  providerKey: "razorpay",
  connectionMethod: "manual",
  razorpayAccountId: null,
  status: "connected",
  isActive: true,
  lastValidatedAt: null,
  lastValidationError: null,
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

function putRequest(body: unknown, id = tenantId): Request {
  return new Request(`http://localhost/api/super-admin/temples/${id}/payments`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(id = tenantId) {
  return { params: Promise.resolve({ tenantId: id }) };
}

describe("super admin payment connection route", () => {
  beforeEach(() => {
    vi.mocked(requireSuperAdmin).mockReset();
    vi.mocked(getTenantById).mockReset();
    vi.mocked(connectPaymentAccountForSuperAdmin).mockReset();
    vi.mocked(disconnectPaymentAccount).mockReset();
    vi.mocked(getActivePaymentAccountForTenant).mockReset();
    vi.mocked(validateCredentials).mockReset();
    vi.mocked(PaymentAuditService.accountConnectedBySuperAdmin).mockReset();
    vi.mocked(PaymentAuditService.accountDisconnectedBySuperAdmin).mockReset();
  });

  describe("PUT", () => {
    it("requires a Super Admin session", async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(null);

      const res = await PUT(putRequest({ keyId: "rzp_test_abc123", keySecret: "secret" }) as never, context());

      expect(res.status).toBe(401);
      expect(connectPaymentAccountForSuperAdmin).not.toHaveBeenCalled();
    });

    it("404s for a non-UUID tenantId without ever touching the database", async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin as never);

      const res = await PUT(putRequest({ keyId: "rzp_test_abc123", keySecret: "secret" }, "not-a-uuid") as never, context("not-a-uuid"));

      expect(res.status).toBe(404);
      expect(getTenantById).not.toHaveBeenCalled();
    });

    it("404s when the tenant doesn't exist", async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin as never);
      vi.mocked(getTenantById).mockResolvedValue(null);

      const res = await PUT(putRequest({ keyId: "rzp_test_abc123", keySecret: "secret" }) as never, context());

      expect(res.status).toBe(404);
    });

    it("rejects a structurally invalid Key ID before ever calling Razorpay", async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin as never);
      vi.mocked(getTenantById).mockResolvedValue({ id: tenantId } as never);

      const res = await PUT(putRequest({ keyId: "not-a-real-key-id", keySecret: "secret" }) as never, context());
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(validateCredentials).not.toHaveBeenCalled();
    });

    it("never saves credentials that fail live validation against Razorpay", async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin as never);
      vi.mocked(getTenantById).mockResolvedValue({ id: tenantId } as never);
      vi.mocked(validateCredentials).mockResolvedValue({ ok: false, error: "Authentication failed" });

      const res = await PUT(
        putRequest({ keyId: "rzp_test_abc123", keySecret: "wrong-secret" }) as never,
        context(),
      );
      const body = await res.json();

      expect(res.status).toBe(502);
      expect(body.error).toContain("Authentication failed");
      expect(connectPaymentAccountForSuperAdmin).not.toHaveBeenCalled();
    });

    it("connects and audit-logs as a super-admin action once validation passes", async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin as never);
      vi.mocked(getTenantById).mockResolvedValue({ id: tenantId } as never);
      vi.mocked(validateCredentials).mockResolvedValue({ ok: true });
      vi.mocked(connectPaymentAccountForSuperAdmin).mockResolvedValue(account);

      const res = await PUT(
        putRequest({ keyId: "rzp_test_abc123", keySecret: "correct-secret", webhookSecret: "whsec" }) as never,
        context(),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.account).toEqual(account);
      expect(connectPaymentAccountForSuperAdmin).toHaveBeenCalledWith(tenantId, {
        providerKey: "razorpay",
        keyId: "rzp_test_abc123",
        keySecret: "correct-secret",
        webhookSecret: "whsec",
      });
      expect(PaymentAuditService.accountConnectedBySuperAdmin).toHaveBeenCalledWith(
        tenantId,
        superAdmin.id,
        account.id,
        account.providerKey,
      );
    });
  });

  describe("DELETE", () => {
    it("requires a Super Admin session", async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(null);

      const res = await DELETE({} as never, context());

      expect(res.status).toBe(401);
      expect(disconnectPaymentAccount).not.toHaveBeenCalled();
    });

    it("returns 400 when nothing is connected", async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin as never);
      vi.mocked(getActivePaymentAccountForTenant).mockResolvedValue(null);

      const res = await DELETE({} as never, context());
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.code).toBe("NOT_CONNECTED");
    });

    it("disconnects and audit-logs as a super-admin action", async () => {
      vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin as never);
      vi.mocked(getActivePaymentAccountForTenant).mockResolvedValue(account);

      const res = await DELETE({} as never, context());

      expect(res.status).toBe(200);
      expect(disconnectPaymentAccount).toHaveBeenCalledWith(tenantId, account.id);
      expect(PaymentAuditService.accountDisconnectedBySuperAdmin).toHaveBeenCalledWith(tenantId, superAdmin.id, account.id);
    });
  });
});
