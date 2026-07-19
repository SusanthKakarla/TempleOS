import type { Devotee } from "@/types/db";
import { formatInr } from "@/lib/currency";

const INTERACTION_LABEL: Record<string, string> = {
  menu: "Viewed menu",
  viewed_events: "Viewed events",
  requested_contact: "Requested contact",
  viewed_timings: "Viewed timings",
  viewed_history: "Viewed history",
  viewed_sevas: "Viewed sevas",
  viewed_faq: "Viewed FAQ",
  viewed_donation_info: "Viewed donation info",
  viewed_help: "Viewed help",
  selected_language: "Selected language",
  requested_language_change: "Requested language change",
  unknown: "Unrecognized message",
};

/** Devotee-since / total donated / last interaction — no new queries, all already on the Devotee record. */
export function ConversationDetailsStrip({ devotee }: { devotee: Devotee }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <span>
        Devotee since{" "}
        <span className="font-medium text-foreground">
          {new Date(devotee.firstSeenAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
        </span>
      </span>
      {devotee.isDonor && (
        <span>
          Total donated{" "}
          <span className="font-medium text-foreground">{formatInr(Number(devotee.totalDonatedAmount))}</span>
        </span>
      )}
      {devotee.lastInteractionType && (
        <span>
          Last interaction:{" "}
          <span className="font-medium text-foreground">
            {INTERACTION_LABEL[devotee.lastInteractionType] ?? devotee.lastInteractionType}
          </span>
        </span>
      )}
    </div>
  );
}
