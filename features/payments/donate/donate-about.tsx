"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface DonateAboutProps {
  description: string;
}

/**
 * "About this campaign" — the campaign's own full description, in one
 * compact paragraph, not a bordered/shadowed card. Replaces the previous
 * "The Story" card (same underlying data — campaign.description — just
 * presented as plain page content instead of a boxed section, and without
 * repeating the banner image the Hero already shows).
 */
export function DonateAbout({ description }: DonateAboutProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="mx-auto max-w-[640px] px-5 py-8 sm:px-6">
      <h2 className="font-heading text-2xl font-semibold text-[#2F211B] sm:text-[26px]">About this campaign</h2>
      <p className={cn("mt-3 text-base leading-relaxed text-[#756A61]", !expanded && "line-clamp-4")}>{description}</p>
      {!expanded && description.length > 180 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-sm font-semibold text-[#D98200] underline-offset-4 hover:underline"
        >
          Read more
        </button>
      )}
    </section>
  );
}
