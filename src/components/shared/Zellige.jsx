import { cn } from "@/lib/utils";

/**
 * Faint 8-point-star lattice (two overlapped squares), 1px hairline in currentColor. Decorative only:
 * hero, empty states, final CTA. Mask it with a radial gradient on the wrapper; never run it edge to edge.
 */
export default function Zellige({ className, id = "zellige" }) {
  return (
    <svg aria-hidden className={cn("pointer-events-none absolute inset-0 size-full text-fg-faint", className)}>
      <defs>
        <pattern id={id} width="3.5em" height="3.5em" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke">
            <rect x="0.7em" y="0.7em" width="2.1em" height="2.1em" />
            <rect x="0.7em" y="0.7em" width="2.1em" height="2.1em" transform="rotate(45 1.75em 1.75em)" />
            <circle cx="1.75em" cy="1.75em" r="0.32em" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
