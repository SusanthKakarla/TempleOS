import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findActiveAdminByPhone, setAdminFirebaseUid } from "@/lib/db/admin-users";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { devLog } from "@/lib/firebase/errors";

const bodySchema = z.object({ idToken: z.string().min(1) });

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    devLog("Session request rejected: invalid body");
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(parsed.data.idToken);
  } catch (err) {
    devLog("Firebase ID token verification failed", err);
    return NextResponse.json({ error: "Invalid or expired login code" }, { status: 401 });
  }

  const phoneNumber = decoded.phone_number as string | undefined;
  if (!phoneNumber) {
    devLog("Verified token has no phone_number claim", decoded.uid);
    return NextResponse.json({ error: "No phone number on this account" }, { status: 401 });
  }

  const admin = await findActiveAdminByPhone(phoneNumber);
  if (!admin) {
    devLog("Sign-in rejected: phone number not allowlisted", phoneNumber);
    return NextResponse.json(
      { error: "This phone number is not authorized for dashboard access." },
      { status: 403 },
    );
  }

  if (admin.firebaseUid !== decoded.uid) {
    await setAdminFirebaseUid(admin.id, decoded.uid);
  }

  await setSessionCookie({
    adminId: admin.id,
    tenantId: admin.tenantId,
    phoneNumber: admin.phoneNumber,
    displayName: admin.displayName,
  });
  devLog("Session created for admin", admin.id, admin.phoneNumber);

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
