"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { NAV_ITEMS } from "./app-sidebar";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

export function DashboardTopbar({
  displayName,
  phoneNumber,
}: {
  displayName: string;
  phoneNumber: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const tTopbar = useTranslations("topbar");
  const [signingOut, setSigningOut] = useState(false);

  const currentItem = [...NAV_ITEMS].reverse().find((item) => pathname?.startsWith(item.href));
  const currentLabel = t(currentItem?.labelKey ?? "dashboard");

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="glass-panel relative z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-0 border-b px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-1 h-5" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium">{currentLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label={tTopbar("accountMenu")}
                className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-accent"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="gradient-saffron-gold text-xs font-semibold text-saffron-foreground">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">{displayName}</p>
              <p className="text-xs font-normal text-muted-foreground">{phoneNumber}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} disabled={signingOut}>
              <LogOut />
              {signingOut ? tTopbar("signingOut") : tTopbar("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
