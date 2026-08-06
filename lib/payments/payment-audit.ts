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
  /** Super Admin connecting/updating a temple's Razorpay keys from the Temples detail page — post-provisioning, not the wizard's provisioning-time connect (that's accountConnectedDuringProvisioning). */
  accountConnectedBySuperAdmin(tenantId: string, superAdminId: string, accountId: string, providerKey: string) {
    return createAuditLogEntry({
      actorType: "super_admin",
      actorId: superAdminId,
      tenantId,
      action: "payment_account.connected",
      targetType: "payment_account",
      targetId: accountId,
      metadata: { providerKey, viaSuperAdminEdit: true },
    });
  },
  accountDisconnectedBySuperAdmin(tenantId: string, superAdminId: string, accountId: string) {
    return createAuditLogEntry({
      actorType: "super_admin",
      actorId: superAdminId,
      tenantId,
      action: "payment_account.disconnected",
      targetType: "payment_account",
      targetId: accountId,
      metadata: { viaSuperAdminEdit: true },
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
  /** Donation/receipt creation threw partway through runCaptureSideEffects — the transaction stays 'captured' (money is real), but has no donation/receipt attached yet. Reconciliation retries it; this just makes the failure visible instead of silent. */
  captureSideEffectsFailed(tenantId: string, transactionId: string, error: string) {
    return createAuditLogEntry({
      actorType: "system",
      actorId: tenantId,
      tenantId,
      action: "payment_transaction.capture_side_effects_failed",
      targetType: "payment_transaction",
      targetId: transactionId,
      metadata: { error },
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
  refundFailed(tenantId: string, refundId: string) {
    return createAuditLogEntry({
      actorType: "system",
      actorId: tenantId,
      tenantId,
      action: "payment_refund.failed",
      targetType: "payment_refund",
      targetId: refundId,
      metadata: {},
    });
  },
  reconciliationRunCompleted(tenantId: string, logId: string, mismatchesFound: number, autoResolved: number) {
    return createAuditLogEntry({
      actorType: "system",
      actorId: tenantId,
      tenantId,
      action: "payment_reconciliation.run_completed",
      targetType: "payment_reconciliation_log",
      targetId: logId,
      metadata: { mismatchesFound, autoResolved },
    });
  },
  /** Super Admin toggled a provider's platform-wide availability/connection-mode settings (Platform Payment Settings page) — affects every tenant simultaneously. `payment_providers.key` (e.g. "phonepe") is a text key, not a UUID, so it goes in metadata rather than the UUID-typed targetId column. */
  platformProviderSettingsUpdated(superAdminId: string, providerKey: string, changes: Record<string, unknown>) {
    return createAuditLogEntry({
      actorType: "super_admin",
      actorId: superAdminId,
      tenantId: null,
      action: "payment_provider.platform_settings_updated",
      targetType: "payment_provider",
      targetId: null,
      metadata: { providerKey, ...changes },
    });
  },
  /** Attempted a Partner-onboarding connect for a provider that doesn't support it yet (e.g. PhonePe today) — keeps the attempt visible in the audit trail even though nothing was actually connected. */
  partnerOnboardingNotAvailable(tenantId: string, actorId: string, providerKey: string) {
    return createAuditLogEntry({
      actorType: "tenant_member",
      actorId,
      tenantId,
      action: "payment_account.partner_onboarding_not_available",
      targetType: "payment_account",
      targetId: null,
      metadata: { providerKey },
    });
  },
  oauthTokenRefreshFailed(tenantId: string, accountId: string, error: string) {
    return createAuditLogEntry({
      actorType: "system",
      actorId: tenantId,
      tenantId,
      action: "payment_account.oauth_token_refresh_failed",
      targetType: "payment_account",
      targetId: accountId,
      metadata: { error },
    });
  },
};
