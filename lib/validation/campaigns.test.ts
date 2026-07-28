import { describe, expect, it } from "vitest";
import { createCampaignSchema } from "./campaigns";

const base = {
  title: "Diwali Wishes",
  campaignType: "festival" as const,
};

describe("createCampaignSchema — templateKey", () => {
  it("accepts a real NotificationType value", () => {
    const result = createCampaignSchema.safeParse({ ...base, templateKey: "festival_greeting" });
    expect(result.success).toBe(true);
  });

  it("rejects a typo'd/nonexistent template key at the API boundary", () => {
    const result = createCampaignSchema.safeParse({ ...base, templateKey: "festval_greeting" });
    expect(result.success).toBe(false);
  });

  it("allows omitting templateKey entirely (plain custom-message campaign)", () => {
    const result = createCampaignSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("allows an explicit null templateKey", () => {
    const result = createCampaignSchema.safeParse({ ...base, templateKey: null });
    expect(result.success).toBe(true);
  });
});
