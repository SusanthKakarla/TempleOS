"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import type { Devotee } from "@/types/db";
import { Button } from "@/components/ui/button";
import { DevoteeFormDialog } from "./devotee-form-dialog";

interface DevoteeDetailActionsProps {
  devotee: Devotee;
}

export function DevoteeDetailActions({ devotee }: DevoteeDetailActionsProps) {
  const router = useRouter();
  const tCommon = useTranslations("common");

  return (
    <DevoteeFormDialog
      mode="edit"
      devotee={devotee}
      trigger={
        <Button variant="outline" className="gap-1.5">
          <Pencil className="size-4" />
          {tCommon("edit")}
        </Button>
      }
      onSaved={() => router.refresh()}
    />
  );
}
