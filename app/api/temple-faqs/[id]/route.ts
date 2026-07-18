import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth/session";
import { deleteFaq, updateFaq } from "@/lib/db/temple-faqs";
import { updateFaqSchema } from "@/lib/validation/temple-faqs";

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
  const parsed = updateFaqSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  const faq = await updateFaq(session.tenantId, id, parsed.data);
  if (!faq) {
    return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
  }
  return NextResponse.json({ faq });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteFaq(session.tenantId, id);
  if (!deleted) {
    return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
