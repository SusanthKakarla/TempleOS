import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  bindSuperAdminFirebaseUid,
  findActiveSuperAdminByPhone,
} from "@/lib/db/super-admins";
import {
  clearSuperAdminSessionCookie,
  setSuperAdminSessionCookie,
} from "@/lib/auth/super-admin-session";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { devLog } from "@/lib/firebase/errors";

const bodySchema = z.object({ idToken: z.string().min(1) });

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    devLog("Super Admin session request rejected: invalid body");
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(parsed.data.idToken);
  } catch (err) {
    devLog("Super Admin Firebase ID token verification failed", err);
    return NextResponse.json({ error: "Invalid or expired login code" }, { status: 401 });
  }

  const phoneNumber = decoded.phone_number;
  if (typeof phoneNumber !== "string" || !phoneNumber) {
    devLog("Verified Super Admin token has no phone_number claim", decoded.uid);
    return NextResponse.json({ error: "No phone number on this account" }, { status: 401 });
  }

  const superAdmin = await findActiveSuperAdminByPhone(phoneNumber);
  if (!superAdmin) {
    devLog("Super Admin sign-in rejected: phone number not allowlisted", phoneNumber);
    return NextResponse.json(
      {
        error: "This phone number is not authorized for Super Admin access.",
        code: "NOT_AUTHORIZED",
      },
      { status: 403 },
    );
  }

  const bound = await bindSuperAdminFirebaseUid(superAdmin.id, decoded.uid);
  if (!bound) {
    devLog("Super Admin sign-in rejected: Firebase uid mismatch", superAdmin.id);
    return NextResponse.json(
      {
        error: "This phone number is already linked to a different Firebase account.",
        code: "FIREBASE_UID_MISMATCH",
      },
      { status: 403 },
    );
  }

  await setSuperAdminSessionCookie({
    superAdminId: superAdmin.id,
    phoneNumber: superAdmin.phoneNumber,
    displayName: superAdmin.displayName,
  });
  devLog("Super Admin session created", superAdmin.id, superAdmin.phoneNumber);

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearSuperAdminSessionCookie();
  return NextResponse.json({ ok: true });
}
