"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface DonateStoryProps {
  imageUrl: string | null;
  description: string;
}

/** "What happened" — a real story instead of one small paragraph buried in a card. Skipped entirely by the caller when there's no description. */
export function DonateStory({ imageUrl, description }: DonateStoryProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="animate-in fade-in duration-500 mx-auto max-w-[760px] px-5 md:px-6">
      <div className="rounded-[24px] border border-[#F3E7DA] bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
        <h2 className="mb-4 font-heading text-xl text-[#2B2118]">The Story</h2>

        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local asset
          <img src={imageUrl} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />
        )}

        <p className={cn("text-sm leading-relaxed text-[#6B5B4F]", !expanded && "line-clamp-4")}>{description}</p>

        {!expanded && description.length > 180 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-2 text-sm font-semibold text-[#D4AF37] underline-offset-4 hover:underline"
          >
            Read more
          </button>
        )}
      </div>
    </section>
  );
}
