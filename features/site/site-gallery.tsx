"use client";

import { useState } from "react";
import { ImageLightbox } from "@/components/image-lightbox";
import type { SiteImage } from "@/lib/site/site-data";

/**
 * The temple's gallery. Reuses the shared ImageLightbox rather than growing a
 * third copy of the same overlay, and reserves each tile's space from the
 * dimensions recorded at upload so lazy loading costs no layout shift.
 */
export function SiteGallery({ images }: { images: SiteImage[] }) {
  const [active, setActive] = useState<SiteImage | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {images.map((image) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setActive(image)}
            className="group overflow-hidden rounded-2xl border border-black/5 bg-white focus-visible:ring-2 focus-visible:outline-none"
            aria-label={image.title ? `View ${image.title}` : "View temple photo"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL */}
            <img
              src={image.url}
              alt={image.title ?? ""}
              width={image.width ?? 800}
              height={image.height ?? 600}
              loading="lazy"
              decoding="async"
              className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {active && <ImageLightbox src={active.url} alt={active.title ?? "Temple photo"} onClose={() => setActive(null)} />}
    </>
  );
}
