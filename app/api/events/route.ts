import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth/session";
import { createEvent, listEvents } from "@/lib/db/events";
import { createEventSchema, eventStatusSchema } from "@/lib/validation/events";

export async function GET(req: NextRequest) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statusParam = req.nextUrl.searchParams.get("status");
  const statusResult = statusParam ? eventStatusSchema.safeParse(statusParam) : undefined;
  if (statusParam && !statusResult?.success) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }

  const events = await listEvents(session.tenantId, {
    status: statusResult?.data,
    upcomingOnly: req.nextUrl.searchParams.get("upcoming") === "true",
  });
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  const event = await createEvent(session.tenantId, {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    location: parsed.data.location ?? null,
    startsAt: parsed.data.startsAt,
    endsAt: parsed.data.endsAt ?? null,
    status: parsed.data.status,
    createdBy: session.adminId,
  });

  return NextResponse.json({ event }, { status: 201 });
}
