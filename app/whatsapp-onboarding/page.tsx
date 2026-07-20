import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AmbientBackground } from "@/features/dashboard/ambient-background";
import { WhatsAppOnboardingFlow } from "@/features/whatsapp-onboarding/whatsapp-onboarding-flow";
import { verifyHandoffToken } from "@/lib/whatsapp/onboarding-handoff";

interface WhatsAppOnboardingPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function WhatsAppOnboardingPage({ searchParams }: WhatsAppOnboardingPageProps) {
  const { token } = await searchParams;
  const handoff = token ? verifyHandoffToken(token) : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <AmbientBackground />
      {handoff && token ? (
        <WhatsAppOnboardingFlow handoffToken={token} returnUrl={handoff.returnUrl} />
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Connection link expired</CardTitle>
            <CardDescription>
              This WhatsApp connection link is no longer valid. Please return to your temple
              dashboard&apos;s Chatbot Settings page and try again.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      )}
    </main>
  );
}
