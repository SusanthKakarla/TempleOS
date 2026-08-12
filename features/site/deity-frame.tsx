"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The temple's own deity portrait, presented as a physical framed object in
 * 3D space. Ported from the reference site's DeityFrame.
 *
 * CSS 3D only — no WebGL, no Three.js. The frame tilts toward the pointer and
 * its layers separate slightly in Z, so the movement reads as depth rather
 * than as a flat image being skewed. Tilt is capped at 9°, past which the
 * perspective distortion looks like a glitch.
 *
 * Pointer tilt is skipped entirely for touch devices (where there is no
 * hover) and under `prefers-reduced-motion`. The image itself is never
 * cropped, recoloured or generated — it is the temple's uploaded photograph,
 * shown as supplied.
 */
export function DeityFrame({
  src,
  alt,
  accent,
  treatment = "framed",
}: {
  src: string;
  alt: string;
  accent: string;
  treatment?: "framed" | "bare" | "medallion";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setInteractive(fine.matches && !still.matches);
    update();
    fine.addEventListener("change", update);
    still.addEventListener("change", update);
    return () => {
      fine.removeEventListener("change", update);
      still.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!interactive) return;
    const node = containerRef.current;
    if (!node) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        setTilt({ x: -py * 9, y: px * 9 });
      });
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      setTilt({ x: 0, y: 0 });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", reset);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", reset);
    };
  }, [interactive]);

  const rounded = treatment === "medallion" ? "rounded-full" : "rounded-[26px]";
  const innerRounded = treatment === "medallion" ? "rounded-full" : "rounded-[23px]";
  const imageRounded = treatment === "medallion" ? "rounded-full" : "rounded-[17px]";

  return (
    <div ref={containerRef} className="[perspective:1400px]">
      <div
        className="site-float relative transition-transform duration-300 ease-out [transform-style:preserve-3d]"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        {/* Warm halo, pushed behind the frame in Z so it separates on tilt. */}
        <div
          className="pointer-events-none absolute -inset-10 rounded-full blur-3xl"
          style={{ background: accent, opacity: 0.25, transform: "translateZ(-90px)" }}
          aria-hidden="true"
        />

        {treatment === "bare" ? (
          // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL
          <img src={src} alt={alt} className="relative h-auto w-full rounded-[26px] object-cover shadow-2xl" />
        ) : (
          <div
            className={`relative overflow-hidden ${rounded} p-[3px] shadow-[0_40px_80px_-30px_rgba(46,12,19,0.85)]`}
            style={{ background: `linear-gradient(135deg, ${accent}, #F3DFA2, ${accent})` }}
          >
            <div className={`relative overflow-hidden ${innerRounded} bg-[#2E0C13] p-2`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a bundled asset */}
              <img src={src} alt={alt} className={`h-auto w-full ${imageRounded} object-cover`} />
              <div
                className={`site-sheen pointer-events-none absolute inset-0 ${imageRounded}`}
                style={{ transform: "translateZ(40px)" }}
                aria-hidden="true"
              />
            </div>
            <div
              className={`pointer-events-none absolute inset-[3px] ${innerRounded} ring-1 ring-inset ring-[#2E0C13]/40`}
              aria-hidden="true"
            />
          </div>
        )}

        {treatment === "framed" &&
          ["left-2 top-2", "right-2 top-2", "left-2 bottom-2", "right-2 bottom-2"].map((position) => (
            <span
              key={position}
              className={`pointer-events-none absolute ${position} size-2.5 rounded-full bg-[#F3DFA2]`}
              style={{ transform: "translateZ(26px)", boxShadow: "0 0 10px rgba(243,223,162,0.9)" }}
              aria-hidden="true"
            />
          ))}
      </div>
    </div>
  );
}
