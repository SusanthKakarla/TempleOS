"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Phone } from "lucide-react";
import type { Devotee } from "@/types/db";
import { Button } from "@/components/ui/button";
import { DevoteeFormDialog } from "./devotee-form-dialog";

/** Scenario 2 — a devotee created without a phone number can have one added later; opens the same edit dialog every other devotee field uses rather than a separate one-field form. Once saved, a Shared Phone Members section appears automatically if the new number matches another devotee (server-computed on next render). */
export function AddPhoneNumberButton({ devotee }: { devotee: Devotee }) {
  const router = useRouter();
  const t = useTranslations("devotees.detail");

  return (
    <DevoteeFormDialog
      mode="edit"
      devotee={devotee}
      trigger={
        <Button variant="outline" size="sm" className="gap-1.5">
          <Phone className="size-3.5" />
          {t("addPhoneNumber")}
        </Button>
      }
      onSaved={() => router.refresh()}
    />
  );
}
