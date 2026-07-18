import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { requireTenantAdminSession } from "@/lib/auth/tenant-admin";
import { createEvent, listEvents } from "@/lib/db/events";
import type { SessionPayload } from "@/lib/auth/session";

vi.mock("@/lib/auth/tenant-admin", () => ({
  requireTenantAdminSession: vi.fn(),
  tenantAdminAuthResponse: (result: { status: 401 | 403; code: string }) =>
    Response.json({ error: result.code, code: result.code }, { status: result.status }),
}));

vi.mock("@/lib/db/events", () => ({
  createEvent: vi.fn(),
  listEvents: vi.fn(),
}));

const adminSession: SessionPayload = {
  tenantId: "tenant-1",
  personId: "person-1",
  membershipId: "membership-1",
  roles: ["admin"],
  phoneNumber: "+14155552671",
  displayName: "Tenant Admin",
  exp: Date.now() + 60_000,
};

function getRequest(url = "https://svtemple.trytempleos.com/api/events") {
  return { nextUrl: new URL(url) } as never;
}

function postRequest(body: unknown) {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as never;
}

describe("events tenant admin API gate", () => {
  beforeEach(() => {
    vi.mocked(requireTenantAdminSession).mockReset();
    vi.mocked(createEvent).mockReset();
    vi.mocked(listEvents).mockReset();
  });

  it("returns 401 without a valid tenant session", async () => {
    vi.mocked(requireTenantAdminSession).mockResolvedValue({
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
    });

    const res = await GET(getRequest());

    expect(res.status).toBe(401);
    expect(listEvents).not.toHaveBeenCalled();
  });

  it("returns 403 for active non-admin tenant members", async () => {
    vi.mocked(requireTenantAdminSession).mockResolvedValue({
      ok: false,
      status: 403,
      code: "TENANT_ADMIN_REQUIRED",
    });

    const res = await POST(
      postRequest({
        title: "Puja",
        startsAt: "2026-08-01T10:00:00.000Z",
        status: "published",
      }),
    );

    expect(res.status).toBe(403);
    expect(createEvent).not.toHaveBeenCalled();
  });

  it("lists events scoped to the admin session tenant", async () => {
    vi.mocked(requireTenantAdminSession).mockResolvedValue({ ok: true, session: adminSession });
    vi.mocked(listEvents).mockResolvedValue([]);

    const res = await GET(
      getRequest("https://svtemple.trytempleos.com/api/events?tenantId=attacker&status=published"),
    );

    expect(res.status).toBe(200);
    expect(listEvents).toHaveBeenCalledWith("tenant-1", {
      status: "published",
      upcomingOnly: false,
    });
  });

  it("creates events with membership author and session tenant only", async () => {
    vi.mocked(requireTenantAdminSession).mockResolvedValue({ ok: true, session: adminSession });
    vi.mocked(createEvent).mockResolvedValue({
      id: "event-1",
      tenantId: "tenant-1",
      title: "Puja",
      description: null,
      location: null,
      startsAt: "2026-08-01T10:00:00.000Z",
      endsAt: null,
      status: "published",
      createdBy: "membership-1",
      createdAt: "2026-07-18T00:00:00.000Z",
      updatedAt: "2026-07-18T00:00:00.000Z",
    });

    const res = await POST(
      postRequest({
        tenantId: "attacker",
        title: "Puja",
        startsAt: "2026-08-01T10:00:00.000Z",
        status: "published",
      }),
    );

    expect(res.status).toBe(201);
    expect(createEvent).toHaveBeenCalledWith("tenant-1", expect.objectContaining({
      createdBy: "membership-1",
      title: "Puja",
    }));
  });
});
