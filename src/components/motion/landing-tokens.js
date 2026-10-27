// Landing-only motion extras. They EXTEND src/lib/motion-tokens.js (which the lead owns) with the numbers the
// landing choreography needs. Merge into motion-tokens.js when convenient; components import from here meanwhile.
import { duration, ease as baseEase, stagger as baseStagger } from "@/lib/motion-tokens";

export const lpEase = {
  ...baseEase,
  drawer: [0.32, 0.72, 0, 1], // sheets, exploded-layer separation
  outStrong: [0.23, 1, 0.32, 1], // default UI enter
  in: [0.55, 0, 1, 0.45], // exits only, short
};

export const lpDur = {
  ...duration,
  hero: 1.1, // hero headline + layer deal
  draw: 1.4, // pathLength draws
  count: 1.6, // count-ups
  bar: 0.9, // bars settling
  sheet: 0.4, // mobile drawer
};

// useSpring followers (physical params, no `type`)
export const lpFollow = {
  tilt: { stiffness: 180, damping: 22, mass: 0.6 },
  magnet: { stiffness: 220, damping: 18, mass: 0.4 },
  spotlight: { stiffness: 300, damping: 40, mass: 0.5 },
  parallax: { stiffness: 90, damping: 30, mass: 1 },
  layers: { stiffness: 70, damping: 16, mass: 0.9 },
};

export const lpStep = { ...baseStagger, words: 0.045, items: 0.07, cards: 0.1, cells: 0.012 };

// Distances in em (relative to the element font-size)
export const lpDist = { xs: "0.25em", sm: "0.5em", md: "1em", lg: "2em" };

// Pointer amplitudes in degrees (playbook: tilt <= 12deg)
export const lpTilt = { hero: 8, showcase: 6, card: 5 };

// Scroll thresholds in px (layout, not timing)
export const lpScroll = { condense: 24, hideAfter: 480, noise: 4, contactAfter: 320 };

// Shared viewport trigger for reveals
export const lpViewport = { once: true, amount: 0.3, margin: "0px 0px -10% 0px" };
