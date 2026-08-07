import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionAdmin } from "@/lib/auth/session";
import { getTenantBySlug } from "@/lib/db/tenants";
import { canPreviewCampaignAsAdmin } from "./campaign-preview-access";
import { createCampaignPreviewToken } from "./campaign-preview-token";
import type { SessionPayload } from "@/lib/auth/session";
import type { Tenant } from "@/types/db";

vi.mock("@/lib/auth/session", () => ({ getSessionAdmin: vi.fn() }));
vi.mock("@/lib/db/tenants", () => ({ getTenantBySlug: vi.fn() }));

const tenant = { id: "tenant-1", slug: "sri-temple", status: "active" } as Tenant;

function session(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return {
    tenantId: "tenant-1",
    personId: "person-1",
    membershipId: "membership-1",
    roles: ["admin"],
    phoneNumber: "+919000000000",
    displayName: "Temple Admin",
    exp: Date.now() + 60_000,
    ...overrides,
  };
}

describe("canPreviewCampaignAsAdmin", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret-for-preview-tokens";
    vi.mocked(getSessionAdmin).mockReset().mockResolvedValue(null);
    vi.mocked(getTenantBySlug).mockReset().mockResolvedValue(tenant);
  });

  it("grants preview to a signed-in admin of that temple", async () => {
    vi.mocked(getSessionAdmin).mockResolvedValue(session());
    expect(await canPreviewCampaignAsAdmin("sri-temple", "annadanam-fund", null)).toBe(true);
  });

  it("refuses an admin of a DIFFERENT temple", async () => {
    vi.mocked(getSessionAdmin).mockResolvedValue(session({ tenantId: "tenant-2" }));
    expect(await canPreviewCampaignAsAdmin("sri-temple", "annadanam-fund", null)).toBe(false);
  });

  it("refuses an anonymous visitor", async () => {
    expect(await canPreviewCampaignAsAdmin("sri-temple", "annadanam-fund", null)).toBe(false);
  });

  it("grants preview on a valid signed token without any session — the donation host never receives the dashboard cookie", async () => {
    const token = createCampaignPreviewToken("sri-temple", "annadanam-fund");
    expect(await canPreviewCampaignAsAdmin("sri-temple", "annadanam-fund", token)).toBe(true);
    expect(getSessionAdmin).not.toHaveBeenCalled();
  });

  it("refuses a token minted for another campaign, and a forged one", async () => {
    const otherCampaign = createCampaignPreviewToken("sri-temple", "renovation-fund");

    expect(await canPreviewCampaignAsAdmin("sri-temple", "annadanam-fund", otherCampaign)).toBe(false);
    expect(await canPreviewCampaignAsAdmin("sri-temple", "annadanam-fund", "forged.token")).toBe(false);
  });
});
