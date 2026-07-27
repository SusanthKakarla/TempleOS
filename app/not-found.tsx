import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/brand-mark";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center p-4">
      <Card className="glass-card w-full max-w-md rounded-2xl text-center">
        <CardHeader className="items-center gap-3">
          <BrandMark variant="icon" size={56} />
          <CardTitle className="text-lg">Page not found</CardTitle>
          <CardDescription>The page you&apos;re looking for doesn&apos;t exist or has moved.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/" />} size="xl" className="w-full">
            Back to TempleOS
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
