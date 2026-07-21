import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Bell, Cake, HandCoins, Heart, MapPin, MessageCircle, Phone, Sparkles, UsersRound, Users } from "lucide-react";
import { requireDashboardAdmin } from "../../require-dashboard-admin";
import { getDevoteeById } from "@/lib/db/devotees";
import { getFamilyWithMembers } from "@/lib/db/devotee-families";
import { listDonationsByDevotee } from "@/lib/db/donations";
import { listNotificationsForDevotee } from "@/lib/db/notifications";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FadeIn } from "@/components/fade-in";
import { formatInr } from "@/lib/currency";
import { formatDate, formatDateTime } from "@/lib/date";
import type { SupportedLanguage } from "@/types/db";
import { DevoteeDonationsCard } from "@/features/donations/devotee-donations-card";

interface DevoteeDetailPageProps {
  params: Promise<{ id: string }>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

/** Approximate — a UI convenience list, not the tenant-timezone-aware cron dedup logic. */
function daysUntilNextOccurrence(dateStr: string, from: Date): number {
  const [, month, day] = dateStr.split("-").map(Number);
  const startOfToday = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let occurrence = new Date(startOfToday.getFullYear(), month - 1, day);
  if (occurrence < startOfToday) occurrence = new Date(startOfToday.getFullYear() + 1, month - 1, day);
  return Math.round((occurrence.getTime() - startOfToday.getTime()) / 86_400_000);
}

export default async function DevoteeDetailPage({ params }: DevoteeDetailPageProps) {
  const session = await requireDashboardAdmin();
  const locale = (await getLocale()) as SupportedLanguage;
  const t = await getTranslations("devotees.detail");
  const tDevotees = await getTranslations("devotees");
  const tRelationship = await getTranslations("devotees.relationshipNames");

  const { id } = await params;
  const devotee = await getDevoteeById(session.tenantId, id);
  if (!devotee) notFound();

  const [donations, family, notifications] = await Promise.all([
    listDonationsByDevotee(session.tenantId, id),
    devotee.familyId ? getFamilyWithMembers(session.tenantId, devotee.familyId) : Promise.resolve(null),
    listNotificationsForDevotee(session.tenantId, id),
  ]);

  const now = new Date();
  const upcomingOccasions = family
    ? family.members
        .flatMap((member) => [
          member.dateOfBirth
            ? { name: member.displayName, kind: "birthday" as const, daysUntil: daysUntilNextOccurrence(member.dateOfBirth, now) }
            : null,
          member.weddingAnniversary
            ? {
                name: member.displayName,
                kind: "anniversary" as const,
                daysUntil: daysUntilNextOccurrence(member.weddingAnniversary, now),
              }
            : null,
        ])
        .filter((o): o is { name: string; kind: "birthday" | "anniversary"; daysUntil: number } => o !== null && o.daysUntil <= 30)
        .sort((a, b) => a.daysUntil - b.daysUntil)
    : [];

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/devotees"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("backToDevotees")}
      </Link>

      <FadeIn>
      <Card className="glass-card gap-4 rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarFallback className="gradient-blue-purple text-base font-semibold text-white">
                {getInitials(devotee.displayName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-heading text-2xl font-semibold">{devotee.displayName}</h1>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="size-3.5" />
                {devotee.whatsappPhone ?? t("noPhone")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={devotee.whatsappOptInStatus ? "default" : "secondary"}>
              <MessageCircle className="size-3.5" />
              {devotee.whatsappOptInStatus ? tDevotees("optedIn") : tDevotees("notOptedIn")}
            </Badge>
            {devotee.isDonor && (
              <Badge className="gradient-saffron-gold text-saffron-foreground">
                <HandCoins className="size-3.5" />
                {t("donor")}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3">
          <div className="flex items-center gap-2.5">
            <Cake className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t("dateOfBirth")}</p>
              <p className="text-sm font-medium">{devotee.dateOfBirth ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t("birthStar")}</p>
              <p className="text-sm font-medium">{devotee.birthStar ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Users className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t("gothram")}</p>
              <p className="text-sm font-medium">{devotee.ancestralLineage ?? "—"}</p>
            </div>
          </div>
          {devotee.gender && (
            <div className="flex items-center gap-2.5">
              <Users className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t("gender")}</p>
                <p className="text-sm font-medium">{tDevotees(`formDialog.genderOptions.${devotee.gender}`)}</p>
              </div>
            </div>
          )}
          {devotee.maritalStatus && (
            <div className="flex items-center gap-2.5">
              <Heart className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t("maritalStatus")}</p>
                <p className="text-sm font-medium">{tDevotees(`formDialog.maritalStatusOptions.${devotee.maritalStatus}`)}</p>
              </div>
            </div>
          )}
          {devotee.weddingAnniversary && (
            <div className="flex items-center gap-2.5">
              <Heart className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t("weddingAnniversary")}</p>
                <p className="text-sm font-medium">{devotee.weddingAnniversary}</p>
              </div>
            </div>
          )}
        </div>

        {devotee.isDonor && (
          <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">{t("totalDonated")}</p>
              <p className="font-heading text-lg font-semibold">{formatInr(devotee.totalDonatedAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("lastDonation")}</p>
              <p className="font-heading text-lg font-semibold">
                {devotee.lastDonationAt ? formatDate(devotee.lastDonationAt, locale) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("firstSeen")}</p>
              <p className="font-heading text-lg font-semibold">{formatDate(devotee.firstSeenAt, locale)}</p>
            </div>
          </div>
        )}
      </Card>
      </FadeIn>

      {family && (
        <FadeIn>
          <Card className="glass-card gap-4 rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
                <UsersRound className="size-5 text-primary" />
                {t("familyInformation")}
              </h2>
              <Link
                href={`/dashboard/devotees/family/${family.family.id}/edit`}
                className="text-sm text-primary underline-offset-2 hover:underline"
              >
                {t("editFamily")}
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">{t("familyName")}</p>
                <p className="text-sm font-medium">{family.family.familyName}</p>
              </div>
              {(family.family.address || family.family.city || family.family.state) && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {[family.family.address, family.family.city, family.family.state, family.family.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="mb-2 text-xs text-muted-foreground">{t("members")}</p>
              <div className="flex flex-wrap gap-2">
                {family.members.map((member) => (
                  <Link
                    key={member.id}
                    href={`/dashboard/devotees/${member.id}`}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                      member.id === devotee.id ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    {member.displayName}
                    {member.relationship && (
                      <span className="text-xs text-muted-foreground">· {tRelationship(member.relationship)}</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {upcomingOccasions.length > 0 && (
              <div className="border-t pt-4">
                <p className="mb-2 text-xs text-muted-foreground">{t("upcomingOccasions")}</p>
                <ul className="space-y-1.5">
                  {upcomingOccasions.map((occasion, i) => (
                    <li key={`${occasion.name}-${occasion.kind}-${i}`} className="flex items-center gap-2 text-sm">
                      {occasion.kind === "birthday" ? (
                        <Cake className="size-4 text-muted-foreground" />
                      ) : (
                        <Heart className="size-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{occasion.name}</span>
                      <span className="text-muted-foreground">
                        {occasion.kind === "birthday" ? t("birthday") : t("anniversary")} ·{" "}
                        {occasion.daysUntil === 0 ? t("today") : t("inDays", { count: occasion.daysUntil })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </FadeIn>
      )}

      <DevoteeDonationsCard devotee={devotee} donations={donations} />

      <FadeIn>
        <Card className="glass-card gap-4 rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
            <Bell className="size-5 text-saffron" />
            {t("notificationHistory")}
          </h2>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noNotifications")}</p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 border-b pb-2 text-sm last:border-0 last:pb-0">
                  <span>{tDevotees(`notificationTypeLabels.${n.notificationType}`)}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(n.createdAt, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </FadeIn>
    </div>
  );
}
