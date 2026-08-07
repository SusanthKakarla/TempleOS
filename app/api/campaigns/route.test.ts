import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { requireTenantAdminSession } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { createCampaign, getCampaignByClientRequestId } from "@/lib/db/campaigns";
import { getTenantById } from "@/lib/db/tenants";
import type { SessionPayload } from "@/lib/auth/session";
import type { Campaign, Tenant } from "@/types/db";

vi.mock("@/lib/auth/tenant-admin", () => ({
  requireTenantAdminSession: vi.fn(),
  tenantAdminAuthResponse: (result: { status: 401 | 403; code: string }) =>
    Response.json({ error: result.code, code: result.code }, { status: result.status }),
}));
vi.mock("@/lib/auth/features", () => ({ requireTenantFeatureApi: vi.fn() }));
vi.mock("@/lib/db/campaigns", () => ({
  createCampaign: vi.fn(),
  getCampaignByClientRequestId: vi.fn(),
  listCampaigns: vi.fn(),
  countCampaignsFiltered: vi.fn(),
}));
vi.mock("@/lib/db/tenants", () => ({ getTenantById: vi.fn() }));

const adminSession: SessionPayload = {
  tenantId: "tenant-1",
  personId: "person-1",
  membershipId: "membership-1",
  roles: ["admin"],
  phoneNumber: "+14155552671",
  displayName: "Tenant Admin",
  exp: Date.now() + 60_000,
};

const tenant: Tenant = {
  id: "tenant-1",
  slug: "sri-temple",
  name: "Sri Temple",
  status: "active",
  defaultContactPhone: null,
  address: null,
  timezone: "Asia/Kolkata",
  welcomeMessage: null,
  description: null,
  history: null,
  contactEmail: null,
  googleMapsLink: null,
  morningOpen: null,
  morningClose: null,
  eveningOpen: null,
  eveningClose: null,
  donationInfo: null,
  notifyOnNewEvent: false,
  notifyOnEventUpdated: false,
  notifyOnEventCancelled: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "campaign-1",
    tenantId: "tenant-1",
    title: "Annadanam Fund",
    description: null,
    campaignType: "donation",
    status: "draft",
    channel: "whatsapp",
    templateKey: null,
    customMessage: null,
    audienceFilter: { type: "all" },
    bannerMediaId: null,
    linkedEventId: null,
    linkedDonationPurpose: "Annadanam Fund",
    scheduleType: "one_time",
    scheduledAt: null,
    recurrenceRule: null,
    nextRunAt: null,
    lastRunAt: null,
    goalAmount: "50000",
    campaignStartDate: null,
    campaignEndDate: null,
    closingReminderSentAt: null,
    targetReachedAnnouncedAt: null,
    slug: "annadanam-fund-abcd1234",
    donationToken: "tok",
    createdBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const validPayload = {
  title: "Annadanam Fund",
  campaignType: "donation",
  goalAmount: "50000",
  clientRequestId: "11111111-1111-4111-8111-111111111111",
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/campaigns — idempotent replay", () => {
  beforeEach(() => {
    vi.mocked(requireTenantAdminSession).mockReset().mockResolvedValue({ ok: true, session: adminSession });
    vi.mocked(requireTenantFeatureApi).mockReset().mockResolvedValue(null);
    vi.mocked(createCampaign).mockReset();
    vi.mocked(getCampaignByClientRequestId).mockReset();
    vi.mocked(getTenantById).mockReset().mockResolvedValue(tenant);
  });

  it("creates the campaign normally on the first request", async () => {
    vi.mocked(createCampaign).mockResolvedValue(makeCampaign());

    const res = await POST(request(validPayload) as never);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.campaign.id).toBe("campaign-1");
    expect(getCampaignByClientRequestId).not.toHaveBeenCalled();
  });

  it("returns the original campaign instead of erroring when a duplicate submission loses the unique-index race", async () => {
    const uniqueViolation = { code: "23505", constraint: "campaigns_tenant_client_request_id_key" };
    vi.mocked(createCampaign).mockRejectedValue(uniqueViolation);
    vi.mocked(getCampaignByClientRequestId).mockResolvedValue(makeCampaign());

    const res = await POST(request(validPayload) as never);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.campaign.id).toBe("campaign-1");
    expect(getCampaignByClientRequestId).toHaveBeenCalledWith("tenant-1", "11111111-1111-4111-8111-111111111111");
  });

  it("re-throws an unrelated unique violation instead of silently swallowing it", async () => {
    const uniqueViolation = { code: "23505", constraint: "some_other_constraint" };
    vi.mocked(createCampaign).mockRejectedValue(uniqueViolation);

    await expect(POST(request(validPayload) as never)).rejects.toEqual(uniqueViolation);
  });

  it("re-throws if the replay lookup somehow finds nothing (constraint fired but the row vanished)", async () => {
    const uniqueViolation = { code: "23505", constraint: "campaigns_tenant_client_request_id_key" };
    vi.mocked(createCampaign).mockRejectedValue(uniqueViolation);
    vi.mocked(getCampaignByClientRequestId).mockResolvedValue(null);

    await expect(POST(request(validPayload) as never)).rejects.toEqual(uniqueViolation);
  });

  it("rejects a missing goal amount before ever calling createCampaign", async () => {
    const { goalAmount: _omit, ...withoutGoal } = validPayload;
    const res = await POST(request(withoutGoal) as never);
    expect(res.status).toBe(400);
    expect(createCampaign).not.toHaveBeenCalled();
  });
});
