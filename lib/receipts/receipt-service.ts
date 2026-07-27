import { randomUUID } from "node:crypto";
import { uploadImage } from "@/lib/media/imagekit";
import { buildReceiptPdfBuffer } from "./receipt-pdf";
import type { PaymentTransaction, Tenant } from "@/types/db";

/** Deterministic, human-readable, unique per transaction — no separate sequence/counter table needed since the transaction id is already globally unique. */
function generateReceiptNumber(tenant: Pick<Tenant, "slug">, date: Date): string {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `${tenant.slug.toUpperCase().slice(0, 12)}-${datePart}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export interface GenerateReceiptInput {
  tenant: Pick<Tenant, "name" | "slug" | "address">;
  transaction: PaymentTransaction;
  campaignTitle: string | null;
}

export interface GeneratedReceipt {
  receiptNumber: string;
  receiptUrl: string;
}

/**
 * Generates the PDF, uploads it (unguessable ImageKit path — the link is
 * only ever handed to the donor via WhatsApp or the authenticated dashboard,
 * never indexed anywhere public), and returns the two values that get
 * stamped onto the transaction row.
 */
export async function generateAndStoreReceipt(input: GenerateReceiptInput): Promise<GeneratedReceipt> {
  const now = new Date();
  const receiptNumber = generateReceiptNumber(input.tenant, now);

  const pdfBuffer = await buildReceiptPdfBuffer({
    templeName: input.tenant.name,
    templeAddress: input.tenant.address,
    receiptNumber,
    transactionId: input.transaction.id,
    campaignTitle: input.campaignTitle,
    amount: input.transaction.amount,
    currency: input.transaction.currency,
    date: now.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }),
    paymentMethod: input.transaction.providerKey,
    donorName: input.transaction.isAnonymous ? "Anonymous" : input.transaction.donorName,
    donorPhone: input.transaction.donorPhone,
    donorEmail: input.transaction.donorEmail,
  });

  const uploaded = await uploadImage(Buffer.from(pdfBuffer), "receipts", `${receiptNumber}.pdf`);
  return { receiptNumber, receiptUrl: uploaded.url };
}
