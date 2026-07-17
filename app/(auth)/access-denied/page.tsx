import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AccessDeniedPageProps {
  searchParams: Promise<{ phone?: string }>;
}

export default async function AccessDeniedPage({ searchParams }: AccessDeniedPageProps) {
  const { phone } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="size-5" />
          </div>
          <CardTitle>Access not provisioned</CardTitle>
          <CardDescription>
            {phone ? (
              <>
                <span className="font-medium text-foreground">{phone}</span> was verified
                successfully, but it isn&apos;t provisioned for TempleOS Admin access yet.
              </>
            ) : (
              "This phone number isn't provisioned for TempleOS Admin access yet."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Contact your temple&apos;s Super Admin to be added, then try signing in again.
          </p>
          <Button render={<Link href="/login" />} variant="outline" className="w-full">
            Back to login
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
