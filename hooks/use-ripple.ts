"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

/** Click-position ripple spans for Button. No-ops under prefers-reduced-motion. */
export function useRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const id = nextId.current++;
    setRipples((current) => [
      ...current,
      { id, x: event.clientX - rect.left, y: event.clientY - rect.top, size },
    ]);
    setTimeout(() => {
      setRipples((current) => current.filter((ripple) => ripple.id !== id));
    }, 600);
  }, []);

  return { ripples, onPointerDown };
}
