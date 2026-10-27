"use client";

import { useRef } from "react";
import { useInView } from "motion/react";
import { lpDur, lpEase, lpStep } from "@/components/motion/landing-tokens";

/** Each miniature plays once when 40 % visible. Reduced motion: MotionConfig collapses transforms to the end state. */
export function useMini() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  return { ref, inView, initial: "hidden", animate: inView ? "visible" : "hidden" };
}

export const miniParent = (step = lpStep.items, delay = 0.1) => ({
  hidden: {},
  visible: { transition: { staggerChildren: step, delayChildren: delay } },
});

export const miniItem = {
  hidden: { opacity: 0, y: "0.5em" },
  visible: { opacity: 1, y: "0em", transition: { duration: lpDur.reveal, ease: lpEase.outStrong } },
};

export const draw = (delay = 0) => ({
  hidden: { pathLength: 0, opacity: 0 },
  visible: { pathLength: 1, opacity: 1, transition: { pathLength: { duration: lpDur.draw, ease: lpEase.inOut, delay }, opacity: { duration: 0.01, delay } } },
});
