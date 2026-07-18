import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth/session";
import { createDonation, listDonations } from "@/lib/db/donations";
import { createDonationSchema } from "@/lib/validation/donations";

export async function GET(req: NextRequest) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const donations = await listDonations(session.tenantId, {
    search: params.get("search") ?? undefined,
    devoteeId: params.get("devoteeId") ?? undefined,
    dateFrom: params.get("dateFrom") ?? undefined,
    dateTo: params.get("dateTo") ?? undefined,
  });
  return NextResponse.json({ donations });
}

export async function POST(req: NextRequest) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createDonationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  try {
    const donation = await createDonation(session.tenantId, {
      devoteeId: parsed.data.devoteeId,
      amount: parsed.data.amount,
      purpose: parsed.data.purpose,
      paymentMethod: parsed.data.paymentMethod,
      notes: parsed.data.notes ?? null,
      donatedAt: parsed.data.donatedAt,
      recordedBy: session.adminId,
    });
    return NextResponse.json({ donation }, { status: 201 });
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return NextResponse.json({ error: "Selected devotee was not found" }, { status: 400 });
    }
    throw err;
  }
}

function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23503";
}
