"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { amount } from "@/lib/format";
import { lpDur, lpEase } from "./landing-tokens";

/** Count-up driven by a motion value (no re-render per frame). Real text for screen readers, final value if reduced. */
export default function CountUp({ to, decimals = 0, prefix = "", suffix = "", format, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const fmt = format ?? ((v) => amount(v, { decimals }));
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${prefix}${fmt(v)}${suffix}`);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(to);
      return;
    }
    const c = animate(mv, to, { duration: lpDur.count, ease: lpEase.emphasized });
    return () => c.stop();
  }, [inView, reduce, to, mv]);

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{`${prefix}${fmt(to)}${suffix}`}</span>
      <motion.span aria-hidden className="num whitespace-nowrap">
        {text}
      </motion.span>
    </span>
  );
}
