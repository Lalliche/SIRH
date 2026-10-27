"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { duration, ease } from "@/lib/motion-tokens";

// The "cachet" — product's only celebratory device. Use once per screen on validate / pay / declare.
export default function Stamp({ label = "VALIDÉ", sub, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.4, rotate: -9 }}
      animate={{ opacity: 1, scale: 1, rotate: -9 }}
      transition={{ duration: duration.stamp, ease: ease.out }}
      className={cn("inline-flex size-[7em] flex-col items-center justify-center rounded-full border-[3px] border-pine-700/85 text-pine-700/85 dark:border-pine-400 dark:text-pine-400", className)}
      style={{ boxShadow: "inset 0 0 0 3px var(--surface), inset 0 0 0 4px currentColor" }}
      aria-label={label}
    >
      <span className="font-display text-[1.05em] font-bold tracking-[0.08em]">{label}</span>
      {sub && <span className="mt-[0.15em] text-[0.62em] font-semibold tracking-[0.1em]">{sub}</span>}
    </motion.div>
  );
}
