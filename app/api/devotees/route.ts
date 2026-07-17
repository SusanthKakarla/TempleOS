import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth/session";
import { createDevotee, listDevotees } from "@/lib/db/devotees";
import { createDevoteeSchema } from "@/lib/validation/devotees";
import { normalizePhoneNumber } from "@/lib/phone.mts";

export async function GET(req: NextRequest) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const devotees = await listDevotees(session.tenantId, search);
  return NextResponse.json({ devotees });
}

export async function POST(req: NextRequest) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createDevoteeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  const normalizedPhone = normalizePhoneNumber(parsed.data.whatsappPhone);
  if (!normalizedPhone) {
    return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
  }

  try {
    const devotee = await createDevotee(session.tenantId, {
      whatsappPhone: normalizedPhone,
      displayName: parsed.data.displayName,
      dateOfBirth: parsed.data.dateOfBirth ?? null,
      birthStar: parsed.data.birthStar ?? null,
      ancestralLineage: parsed.data.ancestralLineage ?? null,
    });
    return NextResponse.json({ devotee }, { status: 201 });
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
