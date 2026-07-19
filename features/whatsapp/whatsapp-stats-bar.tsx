import { BellRing, Clock, MessageCircle, Send, UserPlus, Users } from "lucide-react";
import type { WhatsAppStats } from "@/types/db";
import { MetricCard } from "@/features/dashboard/metric-card";

function formatDuration(seconds: number | null): number {
  if (seconds === null) return 0;
  return Math.round(seconds);
}

export function WhatsAppStatsBar({ stats }: { stats: WhatsAppStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <MetricCard
        label="Conversations"
        value={stats.totalConversations}
        icon={<MessageCircle className="size-4.5" />}
        gradient="gradient-blue-purple"
      />
      <MetricCard
        label="Unread"
        value={stats.unreadConversations}
        icon={<BellRing className="size-4.5" />}
        gradient="gradient-saffron-gold"
      />
      <MetricCard
        label="Today's Messages"
        value={stats.todaysMessages}
        icon={<Send className="size-4.5" />}
        gradient="gradient-green-emerald"
      />
      <MetricCard
        label="Replies Sent Today"
        value={stats.repliesSentToday}
        icon={<Send className="size-4.5" />}
        gradient="gradient-maroon-orange"
      />
      <MetricCard
        label="Active Devotees (7d)"
        value={stats.activeDevotees}
        icon={<Users className="size-4.5" />}
        gradient="bg-royal-blue"
      />
      <MetricCard
        label="New via WhatsApp"
        value={stats.newDevoteesFromWhatsApp}
        icon={<UserPlus className="size-4.5" />}
        gradient="gradient-blue-purple"
      />
      {stats.avgBotResponseSeconds !== null && (
        <MetricCard
          label="Avg. Bot Response (s)"
          value={formatDuration(stats.avgBotResponseSeconds)}
          icon={<Clock className="size-4.5" />}
          gradient="gradient-saffron-gold"
        />
      )}
    </div>
  );
}
