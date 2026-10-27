"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { lpTilt } from "./landing-tokens";
import { useTilt } from "./useTilt";

/** Pointer-tilt wrapper (perspective on the outside, spring rotation inside). Static on touch / reduced motion. */
export default function TiltCard({ children, max = lpTilt.card, perspective = "70em", className, innerClassName, ...props }) {
  const { rotateX, rotateY, handlers } = useTilt({ max });
  return (
    <div className={cn("[transform-style:preserve-3d]", className)} style={{ perspective }} {...handlers} {...props}>
      <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} className={innerClassName}>
        {children}
      </motion.div>
    </div>
  );
}
