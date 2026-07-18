import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth/session";
import { deleteDonation, updateDonation } from "@/lib/db/donations";
import { updateDonationSchema } from "@/lib/validation/donations";

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
  const parsed = updateDonationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  try {
    const donation = await updateDonation(session.tenantId, id, parsed.data);
    if (!donation) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404 });
    }
    return NextResponse.json({ donation });
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

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteDonation(session.tenantId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
