"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { MotionStagger, MotionStaggerItem } from "@/components/motion-reveal";

export interface DonateGalleryImage {
  id: string;
  imageUrl: string;
  title: string | null;
  width: number | null;
  height: number | null;
}

/**
 * Optional campaign gallery — before/after renovation shots, festival or
 * annadanam photos the temple uploaded. The caller renders nothing when the
 * list is empty, so a campaign without photos shows no empty section.
 *
 * Images are plain <img> with `loading="lazy"` rather than next/image: they
 * are external ImageKit URLs, and the intrinsic width/height recorded at
 * upload time is used to reserve space so lazy loading costs no layout
 * shift.
 */
export function DonateGallery({ images }: { images: DonateGalleryImage[] }) {
  const [lightbox, setLightbox] = useState<DonateGalleryImage | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightbox(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightbox]);

  return (
    <section id="gallery" className="mx-auto max-w-[1040px] px-5 py-14 md:px-6 md:py-16">
      <h2 className="text-center font-heading text-2xl text-[#2B2118] sm:text-3xl">From the Temple</h2>

      <MotionStagger className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {images.map((image) => (
          <MotionStaggerItem key={image.id}>
            <button
              type="button"
              onClick={() => setLightbox(image)}
              className="group block w-full overflow-hidden rounded-[18px] border border-[#F3E7DA] bg-white focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:outline-none"
              aria-label={image.title ? `View ${image.title}` : "View campaign photo"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local asset */}
              <img
                src={image.imageUrl}
                alt={image.title ?? ""}
                width={image.width ?? 800}
                height={image.height ?? 600}
                loading="lazy"
                decoding="async"
                className="aspect-4/3 w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </button>
          </MotionStaggerItem>
        ))}
      </MotionStagger>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.title ?? "Campaign photo"}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            aria-label="Close photo"
            autoFocus
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local asset */}
          <img
            src={lightbox.imageUrl}
            alt={lightbox.title ?? ""}
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
          />
        </div>
      )}
    </section>
  );
}
