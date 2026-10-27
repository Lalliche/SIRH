import { periodLabel } from "@/lib/format";

export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const periodTitle = (period) => cap(periodLabel(period));
const MONTHS_SHORT_CAP = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
export const periodShort = (period) => MONTHS_SHORT_CAP[Number(period.slice(5, 7)) - 1];

/** 6 450 000 → "6,5 M" for chart axes. */
export function compact(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(".", ",")} M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} k`;
  return String(Math.round(n));
}

export const pctDelta = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);

/** "d'octobre 2026" / "de septembre 2026" (elision before a vowel). */
export function deMois(period) {
  const l = periodLabel(period);
  return /^[aeiouhéèàâ]/i.test(l) ? `d'${l}` : `de ${l}`;
}
