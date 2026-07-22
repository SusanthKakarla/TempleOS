import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewTempleForm } from "@/features/super-admin/new-temple-form";
import { listFeatures } from "@/lib/db/features";
import { requireSuperAdminPage } from "../../../require-super-admin";

export default async function NewTemplePage() {
  await requireSuperAdminPage("/super-admin/temples/new");
  const features = await listFeatures();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <Button variant="ghost" className="px-0" render={<Link href="/super-admin/temples" />}>
          <ArrowLeft className="size-4" />
          Back to temples
        </Button>
        <p className="text-sm font-medium text-muted-foreground">Super Admin</p>
        <h1 className="text-2xl font-semibold tracking-normal">New Temple</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Create the tenant, primary subdomain, first member, and optional WhatsApp linkage through
          the canonical provisioning API.
        </p>
      </header>
      <NewTempleForm features={features} />
    </div>
  );
}
