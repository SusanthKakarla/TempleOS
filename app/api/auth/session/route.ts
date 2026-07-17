import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findActiveAdminByPhone, setAdminFirebaseUid } from "@/lib/db/admin-users";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";

const bodySchema = z.object({ idToken: z.string().min(1) });

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(parsed.data.idToken);
  } catch {
    return NextResponse.json({ error: "Invalid or expired login code" }, { status: 401 });
  }

  const phoneNumber = decoded.phone_number as string | undefined;
  if (!phoneNumber) {
    return NextResponse.json({ error: "No phone number on this account" }, { status: 401 });
  }

  const admin = await findActiveAdminByPhone(phoneNumber);
  if (!admin) {
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

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
