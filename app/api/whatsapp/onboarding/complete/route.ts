import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createResultToken, verifyHandoffToken } from "@/lib/whatsapp/onboarding-handoff";

const bodySchema = z.object({
  handoffToken: z.string().min(1),
  code: z.string().min(1),
  wabaId: z.string().min(1),
  phoneNumberId: z.string().min(1),
});

/**
 * Runs on the fixed onboarding domain, which never has a tenant session
 * cookie — the caller's authorization is the still-valid handoff token
 * minted by /api/whatsapp/connect/start, not a cookie.
 */
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const handoff = verifyHandoffToken(parsed.data.handoffToken);
  if (!handoff) {
    return NextResponse.json(
      { error: "This connection link has expired. Please return to your dashboard and try again." },
      { status: 401 },
    );
  }

  const resultToken = createResultToken({
    tenantId: handoff.tenantId,
    code: parsed.data.code,
    wabaId: parsed.data.wabaId,
    phoneNumberId: parsed.data.phoneNumberId,
  });

  const redirectUrl = `${handoff.returnUrl}?whatsapp_connect_token=${encodeURIComponent(resultToken)}`;
  return NextResponse.json({ redirectUrl });
}
