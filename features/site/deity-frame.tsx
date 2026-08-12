"use client";

import { useEffect, useRef, useState } from "react";
import { Mandala } from "./hero-backdrop";

/**
 * The temple's own deity portrait, presented as a physical framed object in
 * 3D space.
 *
 * CSS 3D only — no WebGL, no Three.js. The composition is a stack of layers at
 * different Z depths inside one shared perspective: halo and mandala pushed
 * far behind, the framed portrait at zero, the sheen and corner lamps in
 * front. Tilting the whole stack toward the pointer makes those offsets
 * separate, which is what reads as depth; a single flat image given the same
 * rotation just looks skewed. Tilt is capped at 9°, past which the perspective
 * distortion looks like a glitch.
 *
 * Pointer tilt is skipped entirely for touch devices (where there is no hover)
 * and under `prefers-reduced-motion`. The image itself is never cropped,
 * recoloured or generated — it is the temple's uploaded photograph, shown as
 * supplied.
 */
export function DeityFrame({
  src,
  alt,
  accent,
  accentSoft,
  treatment = "framed",
}: {
  src: string;
  alt: string;
  accent: string;
  accentSoft?: string;
  treatment?: "framed" | "bare" | "medallion";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [interactive, setInteractive] = useState(false);
  const halo = accentSoft ?? accent;

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

  const rounded = treatment === "medallion" ? "rounded-full" : "rounded-[28px]";
  const innerRounded = treatment === "medallion" ? "rounded-full" : "rounded-[25px]";
  const imageRounded = treatment === "medallion" ? "rounded-full" : "rounded-[19px]";

  return (
    <div ref={containerRef} className="[perspective:1400px]">
      <div
        className="site-float relative transition-transform duration-300 ease-out [transform-style:preserve-3d]"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        {/* Mandala ring, furthest back, so it swings widest on tilt. */}
        <Mandala
          color={halo}
          className="absolute top-1/2 left-1/2 size-[150%] -translate-x-1/2 -translate-y-1/2 [transform:translate(-50%,-50%)_translateZ(-140px)]"
        />

        {/* Warm sanctum halo. */}
        <div
          className="pointer-events-none absolute -inset-10 rounded-full blur-3xl"
          style={{ background: halo, opacity: 0.3, transform: "translateZ(-90px)" }}
          aria-hidden="true"
        />

        {treatment === "bare" ? (
          <div className="relative" style={{ transform: "translateZ(10px)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL */}
            <img
              src={src}
              alt={alt}
              className="relative h-auto w-full rounded-[28px] object-cover shadow-[0_50px_90px_-35px_rgba(0,0,0,0.8)]"
            />
            <div
              className="site-sheen pointer-events-none absolute inset-0 rounded-[28px]"
              style={{ transform: "translateZ(30px)" }}
              aria-hidden="true"
            />
          </div>
        ) : (
          <div
            className={`relative overflow-hidden ${rounded} p-[3px] shadow-[0_50px_90px_-32px_rgba(0,0,0,0.85)]`}
            style={{
              background: `linear-gradient(135deg, ${accent}, #F3DFA2, ${accent})`,
              transform: "translateZ(10px)",
            }}
          >
            <div className={`relative overflow-hidden ${innerRounded} bg-black/70 p-2`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a bundled asset */}
              <img src={src} alt={alt} className={`h-auto w-full ${imageRounded} object-cover`} />
              <div
                className={`site-sheen pointer-events-none absolute inset-0 ${imageRounded}`}
                style={{ transform: "translateZ(40px)" }}
                aria-hidden="true"
              />
              {/* Floor glow, as if the portrait were lit from a lamp below. */}
              <div
                className={`pointer-events-none absolute inset-x-0 bottom-0 h-1/3 ${imageRounded}`}
                style={{ background: `linear-gradient(to top, ${accent}44, transparent)` }}
                aria-hidden="true"
              />
            </div>
            <div
              className={`pointer-events-none absolute inset-[3px] ${innerRounded} ring-1 ring-inset ring-black/40`}
              aria-hidden="true"
            />
          </div>
        )}

        {treatment === "framed" &&
          ["left-2 top-2", "right-2 top-2", "left-2 bottom-2", "right-2 bottom-2"].map((position) => (
            <span
              key={position}
              className={`pointer-events-none absolute ${position} size-2.5 rounded-full bg-[#F3DFA2]`}
              style={{ transform: "translateZ(46px)", boxShadow: "0 0 12px rgba(243,223,162,0.95)" }}
              aria-hidden="true"
            />
          ))}
      </div>
    </div>
  );
}
