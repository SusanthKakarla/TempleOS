"use client";

import { MotionConfig } from "framer-motion";

/** Makes every framer-motion consumer in the dashboard respect OS-level reduced-motion automatically. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
