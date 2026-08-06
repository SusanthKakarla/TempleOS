import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { uploadImage } from "@/lib/media/imagekit";
import { isRateLimited } from "@/lib/rate-limit";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Uploads the temple's own static UPI QR code image and returns just the
 * URL — deliberately not routed through `createNotificationMedia`/the
 * `NotificationMedia` table (a payment QR isn't notification media, and
 * stretching that closed category enum for an unrelated concept would be
 * worse than a small duplicate upload route). The UPI connect route
 * (`PUT /api/payments/accounts/upi`) persists the returned URL onto
 * `tenant_payment_accounts.qr_code_url`.
 */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "donations");
  if (featureBlocked) return featureBlocked;

  if (isRateLimited(`upi-qr-upload:${session.membershipId}`, { windowMs: 60_000, maxRequests: 20 })) {
    return NextResponse.json({ error: "Too many uploads. Please slow down." }, { status: 429 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, and WEBP images are supported" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File must be 5MB or smaller" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadImage(buffer, `templeos/${session.tenantId}/upi-qr`, file.name);
    return NextResponse.json({ url: uploaded.url }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("ImageKit credentials")) {
      return NextResponse.json({ error: "Image storage is not configured" }, { status: 503 });
    }
    throw err;
  }
}
