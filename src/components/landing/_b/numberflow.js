import { duration, ease } from "@/lib/motion-tokens";

// Shared NumberFlow config: timings come from motion tokens, digits stay French (U+202F grouping, comma decimal).
const emphasized = `cubic-bezier(${ease.emphasized.join(",")})`;
export const flowTiming = {
  transformTiming: { duration: duration.reveal * 1000, easing: emphasized },
  spinTiming: { duration: duration.reveal * 1000, easing: emphasized },
  opacityTiming: { duration: duration.panel * 1000, easing: "ease-out" },
};
export const FLOW_LOCALE = "fr-FR";
export const flowInt = { maximumFractionDigits: 0 };
export const flowPercent = { style: "percent", maximumFractionDigits: 1 };
export const DA = " DA";
