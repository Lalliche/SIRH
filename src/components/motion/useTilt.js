"use client";

import { useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { lpFollow, lpTilt } from "./landing-tokens";
import { useCanHover } from "./use-media";

/**
 * Pointer -> spring tilt. Returns motion values (never state) plus pointer handlers for the hit area.
 * Inactive on touch devices and under reduced motion (handlers are then empty).
 */
export function useTilt({ max = lpTilt.card, enabled = true } = {}) {
  const reduce = useReducedMotion();
  const canHover = useCanHover();
  const active = enabled && canHover && !reduce;

  const px = useMotionValue(0.5); // 0..1 across the hit area
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), lpFollow.tilt);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), lpFollow.tilt);

  const handlers = active
    ? {
        onPointerMove: (e) => {
          if (e.pointerType === "touch") return;
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        },
        onPointerLeave: () => {
          px.set(0.5);
          py.set(0.5);
        },
      }
    : {};

  return { rotateX, rotateY, px, py, handlers, active };
}
