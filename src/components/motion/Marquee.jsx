"use client";

import { useRef } from "react";
import { useInView } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Masked-edge CSS marquee (compositor-only). The list renders twice (the clone is aria-hidden); the loop pauses
 * off-screen and on hover / focus. Under reduced motion the track stops and wraps into a static grid.
 */
export default function Marquee({ children, duration = 60, gap = "0.75em", reverse = false, className, trackClassName }) {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: "120px" });

  return (
    <div
      ref={ref}
      data-inview={inView}
      className={cn(
        "group/marquee overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_9%,black_91%,transparent)]",
        "motion-reduce:[mask-image:none]",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-max animate-marquee",
          "group-data-[inview=false]/marquee:[animation-play-state:paused] group-hover/marquee:[animation-play-state:paused] group-focus-within/marquee:[animation-play-state:paused]",
          "motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:animate-none",
          reverse && "[animation-direction:reverse]",
          trackClassName,
        )}
        style={{ animationDuration: `${duration}s` }}
      >
        <ul className="flex shrink-0 items-center" style={{ columnGap: gap, paddingInlineEnd: gap }}>
          {children}
        </ul>
        <ul aria-hidden className="flex shrink-0 items-center motion-reduce:hidden" style={{ columnGap: gap, paddingInlineEnd: gap }}>
          {children}
        </ul>
      </div>
    </div>
  );
}
