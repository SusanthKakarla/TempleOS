"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * Client-side animation wrapper for the hero section.
 * Orchestrates a staggered fade-in-up reveal sequence.
 */
export function HeroAnimations({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
