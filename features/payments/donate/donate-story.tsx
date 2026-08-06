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
    <section className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-lg px-5 py-14 duration-700 md:px-6">
      <h2 className="mb-5 text-center font-heading text-2xl text-[#2D2D2D]">The Story</h2>

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local asset
        <img src={imageUrl} alt="" className="mb-5 h-56 w-full rounded-2xl object-cover" />
      )}

      <p className={cn("text-base leading-relaxed text-[#2D2D2D]/85", !expanded && "line-clamp-5")}>{description}</p>

      {!expanded && description.length > 220 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-sm font-semibold text-[#8B1E1E] underline-offset-4 hover:underline"
        >
          Read more
        </button>
      )}
    </section>
  );
}
