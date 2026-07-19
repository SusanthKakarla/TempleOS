import { getLocale, getTranslations } from "next-intl/server";
import type { Devotee, SupportedLanguage } from "@/types/db";
import { formatInr } from "@/lib/currency";
import { formatDate } from "@/lib/date";

/** Devotee-since / total donated / last interaction — no new queries, all already on the Devotee record. */
export async function ConversationDetailsStrip({ devotee }: { devotee: Devotee }) {
  const locale = (await getLocale()) as SupportedLanguage;
  const t = await getTranslations("whatsappActivity.detailsStrip");

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <span>
        {t("devoteeSince")}{" "}
        <span className="font-medium text-foreground">{formatDate(devotee.firstSeenAt, locale)}</span>
      </span>
      {devotee.isDonor && (
        <span>
          {t("totalDonated")}{" "}
          <span className="font-medium text-foreground">{formatInr(Number(devotee.totalDonatedAmount))}</span>
        </span>
      )}
      {devotee.lastInteractionType && (
        <span>
          {t("lastInteraction")}{" "}
          <span className="font-medium text-foreground">
            {t.has(`interactionLabels.${devotee.lastInteractionType}`)
              ? t(`interactionLabels.${devotee.lastInteractionType}`)
              : devotee.lastInteractionType}
          </span>
        </span>
      )}
    </div>
  );
}
