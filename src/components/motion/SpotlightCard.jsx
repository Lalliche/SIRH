"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * One pointermove listener on the grid writes --mx / --my on every [data-spotlight] child (all rects are read
 * first, then all writes, once per frame). Cards render <SpotlightCard> for the glow layers.
 */
export function SpotlightGroup({ children, className, as: Tag = "div", ...props }) {
  const ref = useRef(null);
  const raf = useRef(0);

  const onPointerMove = (e) => {
    if (e.pointerType === "touch") return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const cards = ref.current?.querySelectorAll("[data-spotlight]");
      if (!cards) return;
      const rects = Array.from(cards, (el) => el.getBoundingClientRect());
      cards.forEach((el, i) => {
        el.style.setProperty("--mx", `${clientX - rects[i].left}px`);
        el.style.setProperty("--my", `${clientY - rects[i].top}px`);
      });
    });
  };

  return (
    <Tag ref={ref} onPointerMove={onPointerMove} className={className} {...props}>
      {children}
    </Tag>
  );
}

/** Card shell with a pine spotlight (inner wash + glowing 1px border). Hover-only; invisible on touch. */
export function SpotlightCard({ children, className, glowClassName, ...props }) {
  return (
    <div
      data-spotlight
      className={cn("group/spot relative isolate overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-md", className)}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100",
          "[background:radial-gradient(22em_circle_at_var(--mx,-20em)_var(--my,-20em),color-mix(in_srgb,var(--pine-500)_9%,transparent),transparent_62%)]",
          glowClassName,
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 rounded-[inherit] p-px opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100",
          "[background:radial-gradient(16em_circle_at_var(--mx,-20em)_var(--my,-20em),color-mix(in_srgb,var(--pine-500)_55%,transparent),transparent_62%)]",
          "[-webkit-mask:linear-gradient(black_0_0)_content-box,linear-gradient(black_0_0)] [-webkit-mask-composite:xor] [mask:linear-gradient(black_0_0)_content-box_exclude,linear-gradient(black_0_0)]",
        )}
      />
      {children}
    </div>
  );
}
