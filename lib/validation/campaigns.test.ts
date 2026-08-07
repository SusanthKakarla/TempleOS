import { describe, expect, it } from "vitest";
import { createCampaignSchema, updateCampaignSchema } from "./campaigns";

const base = {
  title: "Diwali Wishes",
  campaignType: "festival" as const,
  goalAmount: "1000",
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

describe("createCampaignSchema — goalAmount is mandatory", () => {
  it("accepts a positive numeric string", () => {
    const result = createCampaignSchema.safeParse({ ...base, goalAmount: "5000" });
    expect(result.success).toBe(true);
  });

  it("accepts a positive number", () => {
    const result = createCampaignSchema.safeParse({ ...base, goalAmount: 5000 });
    expect(result.success).toBe(true);
  });

  it("rejects a missing goalAmount", () => {
    const { goalAmount: _omit, ...withoutGoal } = base;
    const result = createCampaignSchema.safeParse(withoutGoal);
    expect(result.success).toBe(false);
  });

  it("rejects an empty string", () => {
    const result = createCampaignSchema.safeParse({ ...base, goalAmount: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe("Goal amount is required.");
  });

  it("rejects zero", () => {
    const result = createCampaignSchema.safeParse({ ...base, goalAmount: "0" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe("Goal amount must be greater than ₹0.");
  });

  it("rejects a negative amount", () => {
    const result = createCampaignSchema.safeParse({ ...base, goalAmount: "-500" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe("Goal amount must be greater than ₹0.");
  });

  it("rejects non-numeric input", () => {
    const result = createCampaignSchema.safeParse({ ...base, goalAmount: "not-a-number" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe("Goal amount must be a valid number.");
  });

  it("rejects explicit null", () => {
    const result = createCampaignSchema.safeParse({ ...base, goalAmount: null });
    expect(result.success).toBe(false);
  });
});

describe("updateCampaignSchema — goalAmount stays optional but still validated when present", () => {
  it("allows omitting goalAmount entirely (leaves the existing value untouched)", () => {
    const result = updateCampaignSchema.safeParse({ title: "Renamed Campaign" });
    expect(result.success).toBe(true);
  });

  it("still rejects zero/negative/empty when the field is actually sent", () => {
    expect(updateCampaignSchema.safeParse({ goalAmount: "0" }).success).toBe(false);
    expect(updateCampaignSchema.safeParse({ goalAmount: "-1" }).success).toBe(false);
    expect(updateCampaignSchema.safeParse({ goalAmount: "" }).success).toBe(false);
  });

  it("accepts a valid positive amount", () => {
    const result = updateCampaignSchema.safeParse({ goalAmount: "2500" });
    expect(result.success).toBe(true);
  });
});
