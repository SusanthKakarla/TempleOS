import type { CampaignStatus } from "@/types/db";

/** Pure — unit tested directly, no DB. Encodes exactly the state machine in the architecture plan's lifecycle diagram. */
const ALLOWED_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ["scheduled", "running", "cancelled"],
  scheduled: ["running", "paused", "cancelled"],
  running: ["paused", "completed", "scheduled"], // scheduled: a recurring campaign's cycle finished, next run queued
  paused: ["running", "scheduled", "cancelled"], // scheduled: resuming a campaign paused before it ever started sending
  completed: ["archived"],
  cancelled: ["archived"],
  archived: [],
};

export function canTransitionCampaignStatus(from: CampaignStatus, to: CampaignStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
