const NNBSP = " ";

const moneyFmt = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

// "1 234 567,89" with narrow no-break spaces (fr-FR already uses U+202F)
export function amount(n, { decimals = 2 } = {}) {
  if (n == null || Number.isNaN(n)) return "—";
  if (decimals === 0) return intFmt.format(Math.round(n));
  return moneyFmt.format(n);
}

// "1 234 567,89 DA"
export function money(n, opts) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${amount(n, opts)}${NNBSP}DA`;
}

export function int(n) {
  return intFmt.format(n ?? 0);
}

export function percent(n, digits = 1) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(n)}${NNBSP}%`;
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
export const WEEKDAYS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function parts(iso) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

// "27/10/2026"
export function date(iso) {
  if (!iso) return "—";
  const { y, m, d } = parts(iso);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

// "27 octobre 2026"
export function dateLong(iso) {
  if (!iso) return "—";
  const { y, m, d } = parts(iso);
  return `${d === 1 ? "1er" : d} ${MONTHS[m - 1]} ${y}`;
}

// "27 oct."
export function dateShort(iso) {
  if (!iso) return "—";
  const { m, d } = parts(iso);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

// "octobre 2026" from "2026-10"
export function periodLabel(period) {
  const [y, m] = period.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function monthName(m) {
  return MONTHS[m - 1];
}

export function initials(first, last) {
  return `${(first ?? "")[0] ?? ""}${(last ?? "")[0] ?? ""}`.toUpperCase();
}

export function fullName(e) {
  return e ? `${e.firstName} ${e.lastName}` : "—";
}

export function pluralize(n, one, many) {
  return `${int(n)} ${n > 1 ? many ?? `${one}s` : one}`;
}
