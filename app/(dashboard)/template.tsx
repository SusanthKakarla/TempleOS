"use client";

import { motion } from "framer-motion";
import { springSoft } from "@/lib/motion";

// No `y`/transform here on purpose — an animated transform creates a new containing
// block, which breaks `position: sticky` for any child (e.g. the sticky page
// toolbar) against the real scrolling ancestor in DashboardShell.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={springSoft}>
      {children}
    </motion.div>
  );
}
