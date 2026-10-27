"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { ease } from "@/lib/motion-tokens";

/** Counts from 0 to `value` on mount, then tweens between values. Renders the final value when motion is reduced. */
export default function CountUp({ value, format = (v) => String(Math.round(v)), seconds = 0.9 }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(v));
  const first = useRef(true);
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    if (first.current) {
      first.current = false;
      mv.set(0);
    }
    const controls = animate(mv, value, { duration: seconds, ease: ease.out });
    return () => controls.stop();
  }, [value, reduce, mv, seconds]);
  return <motion.span className="num">{text}</motion.span>;
}
