import Link from "next/link";
import { Compass } from "lucide-react";
import { ThemeBackdrop } from "@/components/theme/theme-backdrop";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center p-4">
      <ThemeBackdrop themeKey="notFound" />
      <Card className="glass-card w-full max-w-md rounded-2xl text-center">
        <CardHeader className="items-center">
          <div className="gradient-blue-purple flex size-14 items-center justify-center rounded-2xl text-white shadow-sm">
            <Compass className="size-6" />
          </div>
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
