import { createAuditLogEntry } from "@/lib/db/audit-log";

/** Thin, payment-domain-scoped wrapper over the existing audit_log table — no new logging mechanism. */
export const PaymentAuditService = {
  accountConnected(tenantId: string, actorId: string, accountId: string, providerKey: string) {
    return createAuditLogEntry({
      actorType: "tenant_member",
      actorId,
      tenantId,
      action: "payment_account.connected",
      targetType: "payment_account",
      targetId: accountId,
      metadata: { providerKey },
    });
  },
  accountConnectedDuringProvisioning(tenantId: string, actorId: string, accountId: string, providerKey: string) {
    return createAuditLogEntry({
      actorType: "super_admin",
      actorId,
      tenantId,
      action: "payment_account.connected",
      targetType: "payment_account",
      targetId: accountId,
      metadata: { providerKey, viaProvisioning: true },
    });
  },
  accountDisconnected(tenantId: string, actorId: string, accountId: string) {
    return createAuditLogEntry({
      actorType: "tenant_member",
      actorId,
      tenantId,
      action: "payment_account.disconnected",
      targetType: "payment_account",
      targetId: accountId,
      metadata: {},
    });
  },
  transactionCaptured(tenantId: string, transactionId: string, amount: number) {
    return createAuditLogEntry({
      actorType: "system",
      actorId: tenantId,
      tenantId,
      action: "payment_transaction.captured",
      targetType: "payment_transaction",
      targetId: transactionId,
      metadata: { amount },
    });
  },
  transactionFailed(tenantId: string, transactionId: string) {
    return createAuditLogEntry({
      actorType: "system",
      actorId: tenantId,
      tenantId,
      action: "payment_transaction.failed",
      targetType: "payment_transaction",
      targetId: transactionId,
      metadata: {},
    });
  },
  transactionRefunded(tenantId: string, transactionId: string) {
    return createAuditLogEntry({
      actorType: "system",
      actorId: tenantId,
      tenantId,
      action: "payment_transaction.refunded",
      targetType: "payment_transaction",
      targetId: transactionId,
      metadata: {},
    });
  },
};
