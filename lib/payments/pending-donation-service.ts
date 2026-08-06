import { getPaymentTransactionById, attachDonationAndReceipt, updateTransactionStatus } from "@/lib/db/payment-transactions";
import { createDonation } from "@/lib/db/donations";
import { getCampaignById } from "@/lib/db/campaigns";
import type { PaymentMethod } from "@/types/db";

export type PendingDonationActionError = "not_found" | "already_resolved";

export interface PendingDonationActionResult {
  ok: boolean;
  error?: PendingDonationActionError;
}

async function loadPendingUpiTransaction(tenantId: string, transactionId: string) {
  const transaction = await getPaymentTransactionById(transactionId);
  if (!transaction || transaction.tenantId !== tenantId || transaction.providerKey !== "upi_manual") return null;
  return transaction;
}

/**
 * Records the donation the admin has manually confirmed happened. Reuses
 * `createDonation` with the exact same `manualDonor` shape
 * `runCaptureSideEffects` (the gateway webhook path) already builds — but,
 * per the V0 brief, deliberately does NOT call `generateAndStoreReceipt` or
 * enqueue any notification. The receipt system itself is untouched and
 * still fully wired for the gateway path; temple admins issue UPI receipts
 * manually for now.
 */
export async function approvePendingUpiDonation(
  tenantId: string,
  transactionId: string,
  actorMembershipId: string,
): Promise<PendingDonationActionResult> {
  const transaction = await loadPendingUpiTransaction(tenantId, transactionId);
  if (!transaction) return { ok: false, error: "not_found" };
  if (transaction.status !== "pending_verification") return { ok: false, error: "already_resolved" };

  const campaign = transaction.campaignId ? await getCampaignById(tenantId, transaction.campaignId) : null;

  const notes = [
    `UPI (manual) transaction ${transaction.id}`,
    transaction.upiReference ? `UPI reference: ${transaction.upiReference}` : null,
    transaction.donorPan ? `PAN: ${transaction.donorPan}` : null,
    transaction.donorMessage ? `Message: ${transaction.donorMessage}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const donation = await createDonation(tenantId, {
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
    paymentMethod: "upi_manual" as PaymentMethod,
    itemDescription: null,
    notes,
    donatedAt: new Date().toISOString(),
    recordedBy: actorMembershipId,
  });

  await attachDonationAndReceipt(transaction.id, { donationId: donation.id, receiptNumber: null, receiptUrl: null });
  await updateTransactionStatus(transaction.id, "captured", null);

  return { ok: true };
}

/** No donation row is ever created for a rejected submission. */
export async function rejectPendingUpiDonation(tenantId: string, transactionId: string): Promise<PendingDonationActionResult> {
  const transaction = await loadPendingUpiTransaction(tenantId, transactionId);
  if (!transaction) return { ok: false, error: "not_found" };
  if (transaction.status !== "pending_verification") return { ok: false, error: "already_resolved" };

  await updateTransactionStatus(transaction.id, "failed", null);
  return { ok: true };
}
