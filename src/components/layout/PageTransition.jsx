"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { duration, ease } from "@/lib/motion-tokens";

/** Subtle fade between routes (functional motion only). First paint is never hidden. */
export default function PageTransition({ children }) {
  const pathname = usePathname();
  return (
    <AnimatePresence initial={false}>
      <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: duration.base, ease: ease.out }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
