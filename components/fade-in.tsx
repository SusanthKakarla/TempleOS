"use client";

import { motion } from "framer-motion";
import { springSoft } from "@/lib/motion";

/** Scale-up-from-98%+fade entrance for a detail page's hero card. */
export function FadeIn({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springSoft}
      className={className}
    >
      {children}
    </motion.div>
  );
}
