import type { Transition, Variants } from "framer-motion";

/** Matches the sidebar active-item indicator's original spring feel. */
export const springSnappy: Transition = { type: "spring", stiffness: 400, damping: 32 };

/** Matches the original card hover-lift spring feel (MetricCard, EventCard). */
export const springSoft: Transition = { type: "spring", stiffness: 300, damping: 20 };

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export const rowFadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0 },
};

export function staggerContainer(staggerMs = 0.04): Variants {
  return { show: { transition: { staggerChildren: staggerMs } } };
}
