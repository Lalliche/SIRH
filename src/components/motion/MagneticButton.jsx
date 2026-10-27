"use client";

import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import { lpFollow } from "./landing-tokens";
import { useCanHover } from "./use-media";

const PULL = 0.3; // fraction of the pointer offset (playbook: <= 0.35)

/** Hover-magnet wrapper for a CTA. The padded outer area catches the pointer so the target never runs away. */
export default function MagneticButton({ children, className }) {
  const reduce = useReducedMotion();
  const canHover = useCanHover();
  const x = useSpring(0, lpFollow.magnet);
  const y = useSpring(0, lpFollow.magnet);
  const lx = useTransform(x, (v) => v * 0.4);
  const ly = useTransform(y, (v) => v * 0.4);
  const on = canHover && !reduce;

  const handlers = on
    ? {
        onPointerMove: (e) => {
          const r = e.currentTarget.getBoundingClientRect();
          x.set((e.clientX - (r.left + r.width / 2)) * PULL);
          y.set((e.clientY - (r.top + r.height / 2)) * PULL);
        },
        onPointerLeave: () => {
          x.set(0);
          y.set(0);
        },
      }
    : {};

  return (
    <div className={cn("-m-[0.9em] inline-flex p-[0.9em]", className)} {...handlers}>
      <motion.div style={{ x, y }} className="inline-flex">
        <motion.div style={{ x: lx, y: ly }} className="inline-flex">
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}
