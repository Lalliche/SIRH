// Pure date helpers on ISO strings (YYYY-MM-DD). Algerian week: Sun–Thu, weekend = Fri + Sat.
export function toDate(iso) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
export function toIso(dt) {
  return dt.toISOString().slice(0, 10);
}
export function addDays(iso, n) {
  const dt = toDate(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return toIso(dt);
}
export function diffDays(a, b) {
  return Math.round((toDate(b) - toDate(a)) / 86400000);
}
export function weekday(iso) {
  return toDate(iso).getUTCDay(); // 0 = dimanche
}
export function isWeekend(iso) {
  const w = weekday(iso);
  return w === 5 || w === 6;
}
export function monthKey(iso) {
  return iso.slice(0, 7);
}
export function daysInMonth(period) {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
export function listDays(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

// Fixed + estimated religious public holidays (religious dates are estimates until confirmed).
export const HOLIDAYS = [
  { date: "2026-01-01", label: "Nouvel an" },
  { date: "2026-01-12", label: "Yennayer" },
  { date: "2026-03-20", label: "Aïd el-Fitr", estimated: true },
  { date: "2026-03-21", label: "Aïd el-Fitr", estimated: true },
  { date: "2026-03-22", label: "Aïd el-Fitr", estimated: true },
  { date: "2026-05-01", label: "Fête du travail" },
  { date: "2026-05-27", label: "Aïd el-Adha", estimated: true },
  { date: "2026-05-28", label: "Aïd el-Adha", estimated: true },
  { date: "2026-05-29", label: "Aïd el-Adha", estimated: true },
  { date: "2026-06-17", label: "Nouvel an hégirien", estimated: true },
  { date: "2026-06-26", label: "Achoura", estimated: true },
  { date: "2026-07-05", label: "Fête de l'indépendance" },
  { date: "2026-08-25", label: "Mawlid Ennabawi", estimated: true },
  { date: "2026-11-01", label: "Anniversaire de la Révolution" },
  { date: "2027-01-01", label: "Nouvel an" },
  { date: "2027-01-12", label: "Yennayer" },
];
export const holidayOn = (iso) => HOLIDAYS.find((h) => h.date === iso);

// Working days between two ISO dates inclusive (excludes Fri/Sat and public holidays)
export function workingDays(from, to) {
  return listDays(from, to).filter((d) => !isWeekend(d) && !holidayOn(d)).length;
}
