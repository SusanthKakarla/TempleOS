"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SuperAdminSignOutButton() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/super-admin/auth/session", { method: "DELETE" });
      router.push("/super-admin/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleSignOut} disabled={signingOut}>
      <LogOut className="size-4" />
      {signingOut ? "Signing out..." : "Log out"}
    </Button>
  );
}
