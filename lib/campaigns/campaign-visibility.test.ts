import { describe, expect, it } from "vitest";
import { computeDaysLeftInTimeZone, evaluateCampaignWindow, type CampaignWindowFields } from "./campaign-visibility";

const IST = "Asia/Kolkata";

function campaign(overrides: Partial<CampaignWindowFields> = {}): CampaignWindowFields {
  return { status: "running", campaignStartDate: null, campaignEndDate: null, ...overrides };
}

/** 09:00 IST on the given calendar day — mid-morning, well clear of both midnights. */
function istMorning(date: string): Date {
  return new Date(`${date}T03:30:00.000Z`);
}

describe("evaluateCampaignWindow", () => {
  it("regression: a campaign is live for the WHOLE of its end date in the temple's timezone — comparing the DATE column as an instant (new Date('2026-08-31') = midnight UTC = 05:30 IST) marked Indian campaigns 'expired' on the morning of their final day, which is what showed 'This campaign has ended' on a campaign that was still running", () => {
    const august = campaign({ campaignStartDate: "2026-08-01", campaignEndDate: "2026-08-31" });

    // 00:30 IST on the end date — 19:00 UTC the day before.
    expect(evaluateCampaignWindow(august, IST, new Date("2026-08-30T19:00:00.000Z"))).toBeNull();
    // 06:00 IST on the end date — past UTC midnight, the exact moment the old comparison flipped.
    expect(evaluateCampaignWindow(august, IST, new Date("2026-08-31T00:30:00.000Z"))).toBeNull();
    // 23:59 IST on the end date — still the end date locally.
    expect(evaluateCampaignWindow(august, IST, new Date("2026-08-31T18:29:00.000Z"))).toBeNull();
    // 00:01 IST the following day — now genuinely over.
    expect(evaluateCampaignWindow(august, IST, new Date("2026-08-31T18:31:00.000Z"))).toBe("expired");
  });

  it("regression: a campaign starting today is open from its first local minute, not from 05:30 IST", () => {
    const today = campaign({ campaignStartDate: "2026-08-07", campaignEndDate: "2026-08-20" });

    expect(evaluateCampaignWindow(today, IST, new Date("2026-08-06T18:31:00.000Z"))).toBeNull();
    expect(evaluateCampaignWindow(today, IST, new Date("2026-08-06T18:29:00.000Z"))).toBe("not_started");
  });

  it("keeps a single-day campaign open for that entire day", () => {
    const oneDay = campaign({ campaignStartDate: "2026-08-07", campaignEndDate: "2026-08-07" });

    expect(evaluateCampaignWindow(oneDay, IST, istMorning("2026-08-07"))).toBeNull();
    expect(evaluateCampaignWindow(oneDay, IST, istMorning("2026-08-06"))).toBe("not_started");
    expect(evaluateCampaignWindow(oneDay, IST, istMorning("2026-08-08"))).toBe("expired");
  });

  it("treats a missing start or end date as unbounded on that side", () => {
    expect(evaluateCampaignWindow(campaign({ campaignEndDate: "2026-08-31" }), IST, istMorning("2020-01-01"))).toBeNull();
    expect(evaluateCampaignWindow(campaign({ campaignStartDate: "2026-08-01" }), IST, istMorning("2099-01-01"))).toBeNull();
    expect(evaluateCampaignWindow(campaign(), IST, istMorning("2026-08-07"))).toBeNull();
  });

  it("accepts a full timestamp in the date fields, not just 'yyyy-MM-dd'", () => {
    const withTimestamps = campaign({
      campaignStartDate: "2026-08-01T00:00:00.000Z",
      campaignEndDate: "2026-08-31T00:00:00.000Z",
    });
    expect(evaluateCampaignWindow(withTimestamps, IST, istMorning("2026-08-31"))).toBeNull();
    expect(evaluateCampaignWindow(withTimestamps, IST, istMorning("2026-09-01"))).toBe("expired");
  });

  it.each(["archived", "cancelled", "paused"] as const)(
    "blocks a %s campaign as disabled even inside its dates — an admin pausing a campaign is the manually-disabled case",
    (status) => {
      const inWindow = campaign({ status, campaignStartDate: "2026-08-01", campaignEndDate: "2026-08-31" });
      expect(evaluateCampaignWindow(inWindow, IST, istMorning("2026-08-07"))).toBe("disabled");
    },
  );

  it.each(["draft", "scheduled", "running", "completed"] as const)(
    "leaves a %s campaign visible — status tracks the WhatsApp broadcast, not the fundraiser, so only campaignEndDate decides whether it has ended",
    (status) => {
      const inWindow = campaign({ status, campaignStartDate: "2026-08-01", campaignEndDate: "2026-08-31" });
      expect(evaluateCampaignWindow(inWindow, IST, istMorning("2026-08-07"))).toBeNull();
    },
  );

  it("reports the date verdict before the status verdict, so an archived-and-expired campaign reads as expired", () => {
    const both = campaign({ status: "archived", campaignEndDate: "2026-08-01" });
    expect(evaluateCampaignWindow(both, IST, istMorning("2026-08-07"))).toBe("expired");
  });

  it("evaluates in the tenant's own timezone, not the server's", () => {
    const ending = campaign({ campaignEndDate: "2026-08-31" });
    const instant = new Date("2026-08-31T18:29:00.000Z"); // 23:59 IST on the 31st, 11:29 in New York

    expect(evaluateCampaignWindow(ending, IST, instant)).toBeNull();
    expect(evaluateCampaignWindow(ending, "America/New_York", instant)).toBeNull();
    expect(evaluateCampaignWindow(ending, "Pacific/Kiritimati", instant)).toBe("expired"); // already 1 Sep there
  });

  it("falls back to UTC for an unusable timezone instead of throwing the donation page down", () => {
    const ending = campaign({ campaignEndDate: "2026-08-31" });
    expect(evaluateCampaignWindow(ending, "Not/AZone", new Date("2026-08-31T12:00:00.000Z"))).toBeNull();
    expect(evaluateCampaignWindow(ending, "Not/AZone", new Date("2026-09-01T12:00:00.000Z"))).toBe("expired");
  });
});

describe("computeDaysLeftInTimeZone", () => {
  it("counts the end day itself, so the final day reads '1 day left' rather than disappearing", () => {
    expect(computeDaysLeftInTimeZone("2026-08-31", IST, istMorning("2026-08-31"))).toBe(1);
    expect(computeDaysLeftInTimeZone("2026-08-31", IST, istMorning("2026-08-30"))).toBe(2);
    expect(computeDaysLeftInTimeZone("2026-08-31", IST, istMorning("2026-08-01"))).toBe(31);
  });

  it("returns null with no end date or once the end date has passed locally", () => {
    expect(computeDaysLeftInTimeZone(null, IST, istMorning("2026-08-07"))).toBeNull();
    expect(computeDaysLeftInTimeZone("2026-08-31", IST, istMorning("2026-09-01"))).toBeNull();
  });
});
