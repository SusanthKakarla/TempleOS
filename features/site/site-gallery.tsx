"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ImageLightbox } from "@/components/image-lightbox";
import type { SiteImage } from "@/lib/site/site-data";

/**
 * The temple's gallery.
 *
 * The first photo is given a double-width, double-height tile and the rest
 * flow around it, so the grid has a focal point instead of reading as a
 * contact sheet. Reuses the shared ImageLightbox rather than growing a third
 * copy of the same overlay, and reserves each tile's space from the dimensions
 * recorded at upload so lazy loading costs no layout shift.
 *
 * `feature` is off on the standalone /gallery page, where an even grid of
 * every photo is the more useful presentation.
 */
export function SiteGallery({ images, feature = false }: { images: SiteImage[]; feature?: boolean }) {
  const t = useTranslations("site.gallery");
  const [active, setActive] = useState<SiteImage | null>(null);

  return (
    <>
      <div className="grid auto-rows-[minmax(0,1fr)] grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setActive(image)}
            className={`group relative overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-sm focus-visible:ring-2 focus-visible:outline-none ${
              feature && index === 0 ? "col-span-2 row-span-2" : ""
            }`}
            aria-label={image.title ? t("viewNamed", { title: image.title }) : t("viewPhoto")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL */}
            <img
              src={image.url}
              alt={image.title ?? ""}
              width={image.width ?? 800}
              height={image.height ?? 600}
              loading="lazy"
              decoding="async"
              className="size-full min-h-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            <span
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden="true"
            />
            {image.title && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-4 text-left text-sm font-medium text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                {image.title}
              </span>
            )}
          </button>
        ))}
      </div>

      {active && <ImageLightbox src={active.url} alt={active.title ?? t("viewPhoto")} onClose={() => setActive(null)} />}
    </>
  );
}
