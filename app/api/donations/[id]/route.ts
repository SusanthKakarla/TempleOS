import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { deleteDonation, updateDonation } from "@/lib/db/donations";
import { updateDonationSchema } from "@/lib/validation/donations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "donations");
  if (featureBlocked) return featureBlocked;

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = updateDonationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  try {
    // Build the update input explicitly so that nullable fields (amount, paymentMethod,
    // itemDescription) are included in the object when present in the parsed payload —
    // the presence-boolean pattern in updateDonation relies on "key" in input to distinguish
    // "omit" from "set to null".
    const updateInput: Parameters<typeof updateDonation>[2] = {};
    if ("devoteeId" in parsed.data) updateInput.devoteeId = parsed.data.devoteeId;
    if ("manualDonor" in parsed.data) {
      updateInput.manualDonor = parsed.data.manualDonor
        ? {
            name: parsed.data.manualDonor.name,
            phone: parsed.data.manualDonor.phone ?? null,
            email: parsed.data.manualDonor.email ?? null,
            address: parsed.data.manualDonor.address ?? null,
            isAnonymous: parsed.data.manualDonor.isAnonymous,
          }
        : undefined;
    }
    if ("amount" in parsed.data) updateInput.amount = parsed.data.amount ?? null;
    if ("purpose" in parsed.data) updateInput.purpose = parsed.data.purpose;
    if ("paymentMethod" in parsed.data) updateInput.paymentMethod = parsed.data.paymentMethod ?? null;
    if ("itemDescription" in parsed.data) updateInput.itemDescription = parsed.data.itemDescription ?? null;
    if ("notes" in parsed.data) updateInput.notes = parsed.data.notes ?? null;
    if ("donatedAt" in parsed.data) updateInput.donatedAt = parsed.data.donatedAt;

    const donation = await updateDonation(session.tenantId, id, updateInput);
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
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "donations");
  if (featureBlocked) return featureBlocked;

  const { id } = await params;
  const deleted = await deleteDonation(session.tenantId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
