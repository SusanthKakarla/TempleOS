import { redirect } from "next/navigation";
import { getSessionAdmin } from "@/lib/auth/session";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroSection } from "@/features/marketing/hero-section";
import { SocialProofBar } from "@/features/marketing/social-proof-bar";
import { FeaturesSection } from "@/features/marketing/features-section";
import { HowItWorksSection } from "@/features/marketing/how-it-works-section";
import { CtaSection } from "@/features/marketing/cta-section";

export default async function RootPage() {
  const session = await getSessionAdmin();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <SocialProofBar />
        <FeaturesSection />
        <HowItWorksSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
