import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { requireDashboardAdmin } from "../require-dashboard-admin";
import { requireTenantFeature } from "@/lib/auth/features";

export default async function WhatsAppActivityIndexPage() {
  const session = await requireDashboardAdmin();
  await requireTenantFeature(session.tenantId, "conversations");
  const t = await getTranslations("whatsappActivity.emptyStates.selectConversation");

  return (
    <div className="animate-in fade-in-0 flex h-full flex-col items-center justify-center gap-3 text-center duration-500">
      <div className="gradient-blue-purple flex size-16 items-center justify-center rounded-2xl shadow-lg">
        <MessageCircle className="size-7 text-white" />
      </div>
      <p className="text-sm font-medium">{t("title")}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{t("description")}</p>
    </div>
  );
}
