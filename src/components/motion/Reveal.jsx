"use client";

import { motion, useReducedMotion } from "motion/react";
import { duration, ease, viewport } from "@/lib/motion-tokens";

/** In-view fade + rise, once. The default entrance for landing content. */
export default function Reveal({ children, delay = 0, y = 16, as = "div", className, ...props }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] ?? motion.div;
  return (
    <Tag
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: duration.reveal, ease: ease.out, delay }}
      className={className}
      {...props}
    >
      {children}
    </Tag>
  );
}
