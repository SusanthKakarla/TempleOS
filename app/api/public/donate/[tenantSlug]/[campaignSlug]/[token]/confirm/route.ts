import { NextRequest, NextResponse } from "next/server";
import { loadDonationCheckoutContext } from "@/lib/payments/donation-checkout-service";
import { getPaymentTransactionById, attachUpiConfirmationProof } from "@/lib/db/payment-transactions";
import { uploadImage } from "@/lib/media/imagekit";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ tenantSlug: string; campaignSlug: string; token: string }>;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_REFERENCE_LENGTH = 100;

/**
 * Public, unauthenticated — a devotee's optional post-payment self-report
 * (UPI reference / screenshot) after being redirected to their UPI app.
 * Re-validates the token the same way the order route does, and additionally
 * requires the transaction to actually belong to this tenant/campaign and
 * still be `pending_verification` on the `upi_manual` provider — so this
 * route can never be used to attach "proof" to an arbitrary transaction id.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  if (isRateLimited(`donate-confirm:${getClientIp(req.headers)}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { tenantSlug, campaignSlug, token } = await params;
  const context = await loadDonationCheckoutContext(tenantSlug, campaignSlug, token);
  if (!context) {
    return NextResponse.json({ error: "This donation link isn't available." }, { status: 404 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const transactionId = formData.get("transactionId");
  if (typeof transactionId !== "string" || !transactionId) {
    return NextResponse.json({ error: "Missing transaction" }, { status: 400 });
  }

  const transaction = await getPaymentTransactionById(transactionId);
  if (
    !transaction ||
    transaction.tenantId !== context.tenant.id ||
    transaction.campaignId !== context.campaign.id ||
    transaction.providerKey !== "upi_manual" ||
    transaction.status !== "pending_verification"
  ) {
    return NextResponse.json({ error: "This donation link isn't available." }, { status: 404 });
  }

  const referenceRaw = formData.get("upiReference");
  const upiReference =
    typeof referenceRaw === "string" && referenceRaw.trim() ? referenceRaw.trim().slice(0, MAX_REFERENCE_LENGTH) : null;

  const file = formData.get("screenshot");
  let paymentScreenshotUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, and WEBP images are supported" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File must be 5MB or smaller" }, { status: 400 });
    }
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadImage(buffer, `templeos/${context.tenant.id}/payment-screenshots`, file.name);
      paymentScreenshotUrl = uploaded.url;
    } catch (err) {
      if (err instanceof Error && err.message.includes("ImageKit credentials")) {
        return NextResponse.json({ error: "Image storage is not configured" }, { status: 503 });
      }
      throw err;
    }
  }

  if (!upiReference && !paymentScreenshotUrl) {
    return NextResponse.json({ error: "Add a UPI reference or a screenshot before submitting." }, { status: 400 });
  }

  await attachUpiConfirmationProof(transactionId, { upiReference, paymentScreenshotUrl });

  return NextResponse.json({ ok: true });
}
