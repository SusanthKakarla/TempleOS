import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth/session";
import { updateDevotee } from "@/lib/db/devotees";
import { updateDevoteeSchema } from "@/lib/validation/devotees";
import { normalizePhoneNumber } from "@/lib/phone.mts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = updateDevoteeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  let normalizedPhone: string | undefined;
  if (parsed.data.whatsappPhone) {
    const result = normalizePhoneNumber(parsed.data.whatsappPhone);
    if (!result) {
      return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
    }
    normalizedPhone = result;
  }

  try {
    const devotee = await updateDevotee(session.tenantId, id, {
      ...parsed.data,
      whatsappPhone: normalizedPhone,
    });
    if (!devotee) {
      return NextResponse.json({ error: "Devotee not found" }, { status: 404 });
    }
    return NextResponse.json({ devotee });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "A devotee with this phone number already exists" },
        { status: 409 },
      );
    }
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}
