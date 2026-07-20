import Link from "next/link";
import { Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-heading text-base font-semibold">
          <span className="gradient-saffron-gold flex size-7 items-center justify-center rounded-lg text-saffron-foreground">
            <Landmark className="size-4" aria-hidden="true" />
          </span>
          TempleOS
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button size="sm" render={<Link href="/login" />}>
            Admin Login
          </Button>
        </div>
      </div>
    </header>
  );
}
