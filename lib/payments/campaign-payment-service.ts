import { getTenantById } from "@/lib/db/tenants";
import { getCampaignById } from "@/lib/db/campaigns";
import { createDonation } from "@/lib/db/donations";
import { listActiveAdminPersonIdsForTenant } from "@/lib/db/tenant-memberships";
import {
  attachDonationAndReceipt,
  getPaymentTransactionById,
  getTransactionByProviderOrderId,
  getTransactionByProviderPaymentId,
  markTransactionCapturedIfNotAlready,
  updateTransactionStatus,
} from "@/lib/db/payment-transactions";
import { upsertRefundStatusFromWebhook } from "@/lib/db/payment-refunds";
import { generateAndStoreReceipt } from "@/lib/receipts/receipt-service";
import { enqueueNotification } from "@/lib/notifications/engine";
import { processNotifications } from "@/lib/notifications/delivery";
import { formatInr } from "@/lib/currency";
import { PaymentAuditService } from "./payment-audit";

/**
 * Applies a webhook-reported payment-status change to the transaction it
 * belongs to. `captured` is idempotent by construction (see
 * markTransactionCapturedIfNotAlready); authorized/failed are plain,
 * side-effect-free status updates — capture (money actually received) is
 * the only status that creates a donation/receipt/notification. Refund
 * events are handled separately by applyRefundEvent, keyed by payment id
 * (not order id) against the payment_refunds table.
 */
export async function applyPaymentEvent(
  paymentAccountId: string,
  providerOrderId: string,
  event: { type: "authorized" | "captured" | "failed"; providerPaymentId: string | null },
): Promise<void> {
  const transaction = await getTransactionByProviderOrderId(paymentAccountId, providerOrderId);
  if (!transaction) return; // unknown order — nothing to apply (already logged at the webhook-log level)

  if (event.type === "authorized") {
    await updateTransactionStatus(transaction.id, "authorized", event.providerPaymentId);
    return;
  }
  if (event.type === "failed") {
    await updateTransactionStatus(transaction.id, "failed", event.providerPaymentId);
    await PaymentAuditService.transactionFailed(transaction.tenantId, transaction.id);
    return;
  }

  // captured
  if (!event.providerPaymentId) return;
  const captured = await markTransactionCapturedIfNotAlready(transaction.id, event.providerPaymentId);
  if (!captured) return; // already processed by an earlier delivery of this same event — every side effect below is skipped

  await PaymentAuditService.transactionCaptured(captured.tenantId, captured.id, captured.amount);
  await runCaptureSideEffects(captured.id);
}

/**
 * Applies a webhook-reported refund status change. Idempotent via
 * upsertRefundStatusFromWebhook's status-transition CAS (mirrors the same
 * pattern markTransactionCapturedIfNotAlready uses for captures) — a
 * redelivered event, or one that arrives after the admin-initiated refund
 * flow already recorded the same outcome, is a no-op. A refund with no
 * matching TempleOS-initiated row (issued directly in the Razorpay
 * dashboard) is still recorded, not dropped.
 */
export async function applyRefundEvent(
  paymentAccountId: string,
  providerPaymentId: string,
  providerRefundId: string,
  status: "processed" | "failed",
  amountPaise: number | null,
): Promise<void> {
  const transaction = await getTransactionByProviderPaymentId(paymentAccountId, providerPaymentId);
  if (!transaction) return;

  const refund = await upsertRefundStatusFromWebhook(
    transaction.tenantId,
    transaction.id,
    providerRefundId,
    amountPaise != null ? amountPaise / 100 : transaction.amount,
    status,
  );
  if (!refund) return; // already in this status — redelivered event, nothing further to do

  if (status === "failed") {
    await PaymentAuditService.refundFailed(transaction.tenantId, refund.id);
    return;
  }

  await updateTransactionStatus(transaction.id, "refunded", providerPaymentId);
  await PaymentAuditService.transactionRefunded(transaction.tenantId, transaction.id);
  await runRefundSideEffects(transaction.id, refund.amount);
}

/** Confirms the refund to the donor over WhatsApp (raw-phone recipient, same as the original receipt) — no PDF regeneration, see the audit/gap report for why. */
async function runRefundSideEffects(transactionId: string, refundAmount: number): Promise<void> {
  const transaction = await getPaymentTransactionById(transactionId);
  if (!transaction) return;

  const tenant = await getTenantById(transaction.tenantId);
  if (!tenant) return;

  const notificationIds: string[] = [];

  if (transaction.donorPhone) {
    const created = await enqueueNotification({
      tenantId: transaction.tenantId,
      recipient: { phone: transaction.donorPhone },
      notificationType: "payment_refunded",
      category: "donation",
      language: "en",
      templateVars: {
        templeName: tenant.name,
        amount: formatInr(refundAmount),
        receiptNumber: transaction.receiptNumber ?? transaction.id,
        transactionId: transaction.id,
      },
    });
    notificationIds.push(...created.map((n) => n.id));
  }

  const adminPersonIds = await listActiveAdminPersonIdsForTenant(transaction.tenantId);
  for (const personId of adminPersonIds) {
    const created = await enqueueNotification({
      tenantId: transaction.tenantId,
      recipient: { personId },
      notificationType: "payment_refunded",
      category: "donation",
      language: "en",
      templateVars: { templeName: tenant.name, amount: formatInr(refundAmount) },
    });
    notificationIds.push(...created.filter((n) => n.channel === "in_app").map((n) => n.id));
  }

  if (notificationIds.length > 0) {
    await processNotifications(notificationIds);
  }
}

/**
 * Everything a successfully captured donation triggers: the donation row
 * (reusing the existing manual-donor shape — no devotee record required),
 * campaign progress (automatic, since donations.purpose matches the
 * campaign's linkedDonationPurpose and getCampaignDonationSummary already
 * sums live), the receipt PDF, the WhatsApp receipt (a raw-phone recipient —
 * only sent if a phone was captured at checkout), and an in-app notification
 * to every tenant admin (the existing Notification Center, not a new
 * real-time push mechanism this app has no infrastructure for).
 */
async function runCaptureSideEffects(transactionId: string): Promise<void> {
  const transaction = await getPaymentTransactionById(transactionId);
  if (!transaction) return;

  const [tenant, campaign] = await Promise.all([
    getTenantById(transaction.tenantId),
    transaction.campaignId ? getCampaignById(transaction.tenantId, transaction.campaignId) : null,
  ]);
  if (!tenant) return;

  const notes = [
    `Razorpay transaction ${transaction.id}`,
    transaction.donorPan ? `PAN: ${transaction.donorPan}` : null,
    transaction.donorMessage ? `Message: ${transaction.donorMessage}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const donation = await createDonation(transaction.tenantId, {
    devoteeId: null,
    manualDonor: {
      name: transaction.donorName,
      phone: transaction.donorPhone,
      email: transaction.donorEmail,
      address: null,
      isAnonymous: transaction.isAnonymous,
    },
    amount: transaction.amount,
    purpose: campaign?.linkedDonationPurpose ?? "online_donation",
    paymentMethod: "razorpay",
    notes,
    donatedAt: new Date().toISOString(),
    recordedBy: null,
  });

  const receipt = await generateAndStoreReceipt({
    tenant,
    transaction,
    campaignTitle: campaign?.title ?? null,
  });
  await attachDonationAndReceipt(transaction.id, {
    donationId: donation.id,
    receiptNumber: receipt.receiptNumber,
    receiptUrl: receipt.receiptUrl,
  });

  const notificationIds: string[] = [];

  if (transaction.donorPhone) {
    const receiptNotifications = await enqueueNotification({
      tenantId: transaction.tenantId,
      recipient: { phone: transaction.donorPhone },
      notificationType: "donation_receipt",
      category: "donation",
      language: "en",
      templateVars: {
        templeName: tenant.name,
        amount: formatInr(transaction.amount),
        campaign: campaign?.title ?? "General Donation",
        receiptNumber: receipt.receiptNumber,
        transactionId: transaction.id,
        date: new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }),
        receiptLink: receipt.receiptUrl,
      },
    });
    notificationIds.push(...receiptNotifications.map((n) => n.id));
  }

  const adminPersonIds = await listActiveAdminPersonIdsForTenant(transaction.tenantId);
  for (const personId of adminPersonIds) {
    const adminNotifications = await enqueueNotification({
      tenantId: transaction.tenantId,
      recipient: { personId },
      notificationType: "payment_captured",
      category: "donation",
      language: "en",
      templateVars: { templeName: tenant.name },
    });
    notificationIds.push(...adminNotifications.filter((n) => n.channel === "in_app").map((n) => n.id));
  }

  if (notificationIds.length > 0) {
    await processNotifications(notificationIds);
  }
}
