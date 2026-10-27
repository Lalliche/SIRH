// Pure attendance helpers. Shift: 08:00 → 17:00, 1 h break, 10 min tolerance.
import { holidayOn, isWeekend, listDays } from "@/lib/dates";
import { TODAY } from "@/lib/clock";
import { isConfirmed } from "@/components/app/leave/leave-utils";

export const SHIFT = { start: "08:00", end: "17:00", lateAfter: "08:10", breakMin: 60, dayHours: 8 };

export const STATUS_OVERRIDE = { pending: { label: "Non pointé", tone: "neutral" } };

export const toMin = (t) => {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const fromMin = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

/** Worked hours for a day (decimal) or null when a punch is missing. */
export function hoursWorked(inT, outT) {
  const a = toMin(inT);
  const b = toMin(outT);
  if (a == null || b == null || b <= a) return null;
  return Math.max(0, (b - a - SHIFT.breakMin) / 60);
}

/** Overtime = hours beyond 8 h counted from the official start (early arrivals do not count). */
export function overtimeHours(inT, outT) {
  const a = toMin(inT);
  const b = toMin(outT);
  if (a == null || b == null) return 0;
  const from = Math.max(a, toMin(SHIFT.start));
  const h = (b - from - SHIFT.breakMin) / 60 - SHIFT.dayHours;
  return h > 0.01 ? Math.round(h * 4) / 4 : 0;
}

/** "8 h 05" */
export function fmtHours(h) {
  if (h == null) return "—";
  const total = Math.round(h * 60);
  const m = total % 60;
  return `${Math.floor(total / 60)} h ${String(m).padStart(2, "0")}`;
}
export const fmtDec = (h, d = 1) => (h == null ? "—" : h.toFixed(d).replace(".", ","));

/** Status implied by a punch-in time; remote/mission are preserved. */
export function punchStatus(inT, prev) {
  if (!inT) return prev === "pending" ? "absent" : prev ?? "absent";
  if (prev === "remote" || prev === "mission") return prev;
  return toMin(inT) > toMin(SHIFT.lateAfter) ? "late" : "present";
}

export const isWorkday = (iso) => !isWeekend(iso) && !holidayOn(iso);

export function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Board rows for one day: every active employee in scope, with their record or an implied status. */
export function buildDayRows({ employees, attendance, leaveRequests }, date) {
  if (!isWorkday(date)) return [];
  const recs = new Map(attendance.filter((a) => a.date === date).map((a) => [a.employeeId, a]));
  return employees
    .filter((e) => e.status !== "sorti" && e.hireDate <= date)
    .map((e) => {
      const record = recs.get(e.id) ?? null;
      let status = record?.status;
      if (!status) {
        const onLeave = leaveRequests.some((l) => l.employeeId === e.id && isConfirmed(l) && l.from <= date && date <= l.to);
        status = onLeave ? "leave" : date < TODAY ? "absent" : "pending";
      }
      const hours = record ? hoursWorked(record.in, record.out) : null;
      return { employee: e, record, status, in: record?.in ?? null, out: record?.out ?? null, hours, deficit: hours != null && hours < SHIFT.dayHours - 0.5 ? SHIFT.dayHours - hours : 0, correction: record?.correction?.status === "pending" ? record.correction : null };
    });
}

export function dayStats(rows) {
  const count = (s) => rows.filter((r) => r.status === s).length;
  const present = rows.filter((r) => ["present", "late", "remote", "mission"].includes(r.status)).length;
  const done = rows.filter((r) => r.hours != null);
  const avg = done.length ? done.reduce((s, r) => s + r.hours, 0) / done.length : null;
  return { total: rows.length, present, late: count("late"), absent: count("absent") + count("pending"), remote: count("remote"), leave: count("leave"), avg, doneCount: done.length };
}

/** Average worked hours over the last N completed working days (fallback while today is still in progress). */
export function recentAverage(attendance, scopeIds, n = 5) {
  const days = listDays("2026-09-01", TODAY).filter((d) => d < TODAY && isWorkday(d)).slice(-n);
  const vals = attendance
    .filter((a) => days.includes(a.date) && scopeIds.has(a.employeeId))
    .map((a) => hoursWorked(a.in, a.out))
    .filter((h) => h != null);
  return vals.length ? vals.reduce((s, h) => s + h, 0) / vals.length : null;
}
