import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Cake, HandCoins, MessageCircle, Phone, Sparkles, Users } from "lucide-react";
import { requireDashboardAdmin } from "../../require-dashboard-admin";
import { getDevoteeById } from "@/lib/db/devotees";
import { listDonationsByDevotee } from "@/lib/db/donations";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatInr } from "@/lib/currency";
import { DevoteeDonationsCard } from "@/features/donations/devotee-donations-card";

interface DevoteeDetailPageProps {
  params: Promise<{ id: string }>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

export default async function DevoteeDetailPage({ params }: DevoteeDetailPageProps) {
  const session = await requireDashboardAdmin();

  const { id } = await params;
  const devotee = await getDevoteeById(session.tenantId, id);
  if (!devotee) notFound();

  const donations = await listDonationsByDevotee(session.tenantId, id);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/devotees"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to devotees
      </Link>

      <Card className="gap-4 p-5">
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
                {devotee.whatsappPhone}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={devotee.whatsappOptInStatus ? "default" : "secondary"}>
              <MessageCircle className="size-3.5" />
              {devotee.whatsappOptInStatus ? "Opted in" : "Not opted in"}
            </Badge>
            {devotee.isDonor && (
              <Badge className="gradient-saffron-gold text-saffron-foreground">
                <HandCoins className="size-3.5" />
                Donor
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3">
          <div className="flex items-center gap-2.5">
            <Cake className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Date of birth</p>
              <p className="text-sm font-medium">{devotee.dateOfBirth ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Birth star</p>
              <p className="text-sm font-medium">{devotee.birthStar ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Users className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Gothram</p>
              <p className="text-sm font-medium">{devotee.ancestralLineage ?? "—"}</p>
            </div>
          </div>
        </div>

        {devotee.isDonor && (
          <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Total donated</p>
              <p className="font-heading text-lg font-semibold">{formatInr(devotee.totalDonatedAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last donation</p>
              <p className="font-heading text-lg font-semibold">
                {devotee.lastDonationAt ? formatDate(devotee.lastDonationAt) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">First seen</p>
              <p className="font-heading text-lg font-semibold">{formatDate(devotee.firstSeenAt)}</p>
            </div>
          </div>
        )}
      </Card>

      <DevoteeDonationsCard devotee={devotee} donations={donations} />
    </div>
  );
}
