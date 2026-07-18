import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth/session";
import { createFaq } from "@/lib/db/temple-faqs";
import { createFaqSchema } from "@/lib/validation/temple-faqs";

export async function POST(req: NextRequest) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createFaqSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  const faq = await createFaq(session.tenantId, parsed.data);
  return NextResponse.json({ faq }, { status: 201 });
}
