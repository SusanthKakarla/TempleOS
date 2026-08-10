"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

/**
 * Full-screen view of a single image, dismissed by Escape, the close button,
 * or a click outside it.
 *
 * Extracted from the campaign gallery so the donation page's UPI QR can be
 * enlarged the same way instead of growing a second, subtly different
 * lightbox. Rendered conditionally by the caller (mount = open), which keeps
 * it usable inside an already-open dialog, where nesting a second focus-
 * trapping Dialog would fight the outer one.
 */
export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        aria-label="Close"
        autoFocus
      >
        <X className="size-5" aria-hidden="true" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local asset */}
      <img
        src={src}
        alt={alt}
        className="max-h-[85vh] max-w-full rounded-2xl bg-white object-contain p-2"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
