import { getTranslations } from "next-intl/server";
import { BellRing, Clock, MessageCircle, Send, UserPlus, Users } from "lucide-react";
import type { WhatsAppStats } from "@/types/db";
import { MetricCard } from "@/features/dashboard/metric-card";

function formatDuration(seconds: number | null): number {
  if (seconds === null) return 0;
  return Math.round(seconds);
}

export async function WhatsAppStatsBar({ stats }: { stats: WhatsAppStats }) {
  const t = await getTranslations("whatsappActivity.stats");

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <MetricCard
        label={t("conversations")}
        value={stats.totalConversations}
        icon={<MessageCircle className="size-4.5" />}
        gradient="gradient-blue-purple"
        compact
      />
      <MetricCard
        label={t("unread")}
        value={stats.unreadConversations}
        icon={<BellRing className="size-4.5" />}
        gradient="gradient-saffron-gold"
        compact
      />
      <MetricCard
        label={t("todaysMessages")}
        value={stats.todaysMessages}
        icon={<Send className="size-4.5" />}
        gradient="gradient-green-emerald"
        compact
      />
      <MetricCard
        label={t("repliesSentToday")}
        value={stats.repliesSentToday}
        icon={<Send className="size-4.5" />}
        gradient="gradient-maroon-orange"
        compact
      />
      <MetricCard
        label={t("activeDevotees")}
        value={stats.activeDevotees}
        icon={<Users className="size-4.5" />}
        gradient="bg-royal-blue"
        compact
      />
      <MetricCard
        label={t("newViaWhatsapp")}
        value={stats.newDevoteesFromWhatsApp}
        icon={<UserPlus className="size-4.5" />}
        gradient="gradient-blue-purple"
        compact
      />
      {stats.avgBotResponseSeconds !== null && (
        <MetricCard
          label={t("avgBotResponse")}
          value={formatDuration(stats.avgBotResponseSeconds)}
          icon={<Clock className="size-4.5" />}
          gradient="gradient-saffron-gold"
          compact
        />
      )}
    </div>
  );
}
