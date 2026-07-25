import { describe, expect, it } from "vitest";
import { canTransitionCampaignStatus } from "./lifecycle";

describe("canTransitionCampaignStatus", () => {
  it("allows the documented lifecycle transitions", () => {
    expect(canTransitionCampaignStatus("draft", "scheduled")).toBe(true);
    expect(canTransitionCampaignStatus("draft", "running")).toBe(true);
    expect(canTransitionCampaignStatus("scheduled", "running")).toBe(true);
    expect(canTransitionCampaignStatus("scheduled", "paused")).toBe(true);
    expect(canTransitionCampaignStatus("running", "paused")).toBe(true);
    expect(canTransitionCampaignStatus("running", "completed")).toBe(true);
    expect(canTransitionCampaignStatus("paused", "running")).toBe(true);
    expect(canTransitionCampaignStatus("paused", "scheduled")).toBe(true);
    expect(canTransitionCampaignStatus("completed", "archived")).toBe(true);
    expect(canTransitionCampaignStatus("cancelled", "archived")).toBe(true);
  });

  it("rejects transitions out of a terminal archived state", () => {
    expect(canTransitionCampaignStatus("archived", "draft")).toBe(false);
    expect(canTransitionCampaignStatus("archived", "running")).toBe(false);
  });

  it("rejects skipping straight from completed back to running", () => {
    expect(canTransitionCampaignStatus("completed", "running")).toBe(false);
  });

  it("rejects an already-cancelled campaign being resumed", () => {
    expect(canTransitionCampaignStatus("cancelled", "running")).toBe(false);
  });
});
