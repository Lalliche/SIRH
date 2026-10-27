"use client";

import { useId, useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { DZ_VIEWBOX, DZ_OUTLINE, DZ_DOTS_NORTH, DZ_DOTS_SOUTH, DZ_HUBS } from "./dz-geo";
import { mapHubs } from "@/content/compliance";
import { duration, ease } from "@/lib/motion-tokens";

const DRAW = duration.reveal * 3; // outline draw
const RIPPLE = duration.reveal * 4; // fill spreading from Alger
const ringDelays = [0, 0.9, 1.8];

const hubStyle = { transformBox: "fill-box", transformOrigin: "center" };

/**
 * Schematic dot-matrix map of Algeria. The outline draws (pathLength), dots spread from Alger through a growing
 * radial mask, rings ripple out of the capital, and the active hub (driven by the ledger) pulses.
 * Purely decorative: the ledger beside it is the accessible content.
 */
export default function DzMap({ activeHub, label, className }) {
  const ref = useRef(null);
  const uid = useId().replace(/:/g, "");
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduce = useReducedMotion();
  const on = inView || reduce;
  const alger = DZ_HUBS.alger;

  return (
    <svg ref={ref} viewBox={DZ_VIEWBOX} role="img" aria-label={label} className={className}>
      <defs>
        <radialGradient id={`${uid}-soft`}>
          <stop offset="0" stopColor="white" />
          <stop offset="0.82" stopColor="white" />
          <stop offset="1" stopColor="black" />
        </radialGradient>
        <mask id={`${uid}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="460" height="460">
          <motion.circle
            cx={alger[0]}
            cy={alger[1]}
            r={470}
            fill={`url(#${uid}-soft)`}
            style={hubStyle}
            initial={reduce ? false : { scale: 0 }}
            animate={{ scale: on ? 1 : 0 }}
            transition={{ duration: RIPPLE, ease: ease.out }}
          />
        </mask>
      </defs>

      {/* country body + outline */}
      <motion.path d={DZ_OUTLINE} fill="var(--surface-2)" stroke="none" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: on ? 1 : 0 }} transition={{ duration: DRAW, ease: ease.out }} />
      <g mask={`url(#${uid}-mask)`}>
        <path d={DZ_DOTS_SOUTH} stroke="var(--border-strong)" strokeWidth="3.4" strokeLinecap="round" />
        <path d={DZ_DOTS_NORTH} stroke="var(--pine-500)" strokeWidth="3.8" strokeLinecap="round" />
      </g>
      <motion.path
        d={DZ_OUTLINE}
        fill="none"
        stroke="var(--pine-600)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: on ? 1 : 0 }}
        transition={{ duration: DRAW, ease: ease.inOut }}
      />

      {/* ripples out of the capital */}
      {!reduce &&
        on &&
        ringDelays.map((delay) => (
          <motion.circle
            key={delay}
            cx={alger[0]}
            cy={alger[1]}
            r={70}
            fill="none"
            stroke="var(--pine-500)"
            strokeWidth="1.25"
            style={hubStyle}
            initial={{ scale: 0.06, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: RIPPLE, ease: ease.out, repeat: Infinity, delay }}
          />
        ))}

      {/* hubs */}
      {mapHubs.map((hub) => {
        const [x, y] = DZ_HUBS[hub.id];
        const active = activeHub === hub.id;
        return (
          <g key={hub.id}>
            {active && !reduce && (
              <motion.circle
                key={`pulse-${hub.id}`}
                cx={x}
                cy={y}
                r={16}
                fill="none"
                stroke="var(--pine-600)"
                strokeWidth="1.5"
                style={hubStyle}
                initial={{ scale: 0.3, opacity: 0.9 }}
                animate={{ scale: 1, opacity: 0 }}
                transition={{ duration: duration.reveal * 2, ease: ease.out, repeat: Infinity }}
              />
            )}
            <motion.circle
              cx={x}
              cy={y}
              r={hub.capital ? 5.5 : 4}
              fill={hub.capital ? "var(--accent)" : "var(--pine-700)"}
              stroke="var(--bg)"
              strokeWidth="2"
              style={hubStyle}
              initial={reduce ? false : { scale: 0 }}
              animate={{ scale: on ? (active ? 1.35 : 1) : 0 }}
              transition={{ duration: duration.panel, ease: ease.out, delay: on && !active ? RIPPLE * 0.4 : 0 }}
            />
            <text
              x={x + 9}
              y={y + 4}
              fontSize="12"
              fontWeight={active || hub.capital ? 600 : 500}
              fill={active || hub.capital ? "var(--text)" : "var(--text-muted)"}
              stroke="var(--surface-2)"
              strokeWidth="3.5"
              paintOrder="stroke"
              strokeLinejoin="round"
              fontFamily="var(--font-ui)"
            >
              {hub.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
