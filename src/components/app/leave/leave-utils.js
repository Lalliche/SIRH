// Pure leave logic shared by Congés, Approbations, Demandes. No React here.
import { addDays, holidayOn, isWeekend, listDays } from "@/lib/dates";
import { TODAY } from "@/lib/clock";

export const CONFLICT_RATE = 0.3; // coverage conflict when > 30 % of a department is out
export const MAX_RANGE = 400;

export const COVER = {
  employer: { label: "Employeur", tone: "neutral" },
  cnas: { label: "CNAS", tone: "info" },
  none: { label: "Sans solde", tone: "warning" },
};
export const PAY_IMPACT = {
  deduction: { label: "Déduction automatique", tone: "warning" },
  none: { label: "Aucun", tone: "neutral" },
};

// Editable defaults (settings.leavePolicies overrides them). Rates marked "à confirmer" in the UI.
export const DEFAULT_POLICIES = {
  accrual: { perMonth: 2.5, cap: 30, carryOver: 10, refStart: "06-01" },
  types: {
    annual: { enabled: true, quota: 30, coveredBy: "employer", proof: "never", approval: "Manager puis RH" },
    sick: { enabled: true, quota: null, coveredBy: "cnas", proof: "over1", approval: "RH" },
    // Loi n°25-08 du 19 juillet 2025 a porté le congé de maternité de 98 à 150 jours, payé à 100 % par la CNAS
    // (prolongation possible en cas de complications médicales documentées). [à confirmer : durée exacte de la prolongation]
    maternity: { enabled: true, quota: 150, coveredBy: "cnas", proof: "always", approval: "RH" },
    unpaid: { enabled: true, quota: null, coveredBy: "none", proof: "never", approval: "Manager puis RH" },
    exceptional: { enabled: true, quota: 3, coveredBy: "employer", proof: "always", approval: "Manager puis RH" },
    recovery: { enabled: true, quota: null, coveredBy: "employer", proof: "never", approval: "Manager" },
    pilgrimage: { enabled: true, quota: 30, coveredBy: "employer", proof: "always", approval: "RH" },
  },
};

export const PROOF_LABEL = {
  never: "Jamais",
  over1: "Au-delà d'1 jour",
  always: "Toujours",
};

export function policiesOf(settings) {
  const saved = settings?.leavePolicies;
  if (!saved) return DEFAULT_POLICIES;
  return {
    accrual: { ...DEFAULT_POLICIES.accrual, ...saved.accrual },
    types: Object.fromEntries(Object.keys(DEFAULT_POLICIES.types).map((k) => [k, { ...DEFAULT_POLICIES.types[k], ...saved.types?.[k] }])),
  };
}

export const coverOf = (type, policies) => policies.types[type]?.coveredBy ?? "employer";
export const payImpactOf = (type, policies) => (coverOf(type, policies) === "none" ? "deduction" : "none");

export function proofRequired(type, workingDays, policies) {
  const p = policies.types[type]?.proof ?? "never";
  return p === "always" || (p === "over1" && workingDays > 1);
}

export const fmtDays = (n) => `${String(Math.round(n * 10) / 10).replace(".", ",")} j`;

export function shiftPeriod(period, delta) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function countLeave(from, to) {
  if (!from || !to || to < from) return { working: 0, calendar: 0, weekend: 0, holidays: [] };
  const days = listDays(from, to).slice(0, MAX_RANGE);
  return {
    working: days.filter((d) => !isWeekend(d) && !holidayOn(d)).length,
    calendar: days.length,
    weekend: days.filter(isWeekend).length,
    holidays: days.filter((d) => !isWeekend(d) && holidayOn(d)).map((d) => ({ date: d, label: holidayOn(d).label })),
  };
}

export const isConfirmed = (r) => r.status === "approved" || r.status === "taken";
export const isActiveEmployee = (e) => e.status !== "sorti";

export function leaveBalance(emp, requests, excludeId, cap = DEFAULT_POLICIES.accrual.cap) {
  const lb = emp?.leaveBalance ?? { annual: 0, taken: 0 };
  const acquired = Math.min(cap, lb.annual + lb.taken);
  const remaining = acquired - lb.taken;
  const pending = requests
    .filter((r) => r.employeeId === emp?.id && r.status === "pending" && r.type === "annual" && r.id !== excludeId)
    .reduce((s, r) => s + r.days, 0);
  return { acquired, taken: lb.taken, remaining, pending, available: remaining - pending };
}

/** Months of service (rounded down), for accrual explanations. */
export function monthsSince(from, to = TODAY) {
  const [y1, m1] = from.split("-").map(Number);
  const [y2, m2] = to.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

export function tenureLabel(hireDate) {
  const months = monthsSince(hireDate);
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mois`;
  return m ? `${y} an${y > 1 ? "s" : ""} ${m} mois` : `${y} an${y > 1 ? "s" : ""}`;
}

/**
 * Full analysis of a (draft or pending) leave request: balance impact, who else is out in the
 * department, coverage per day, holidays, overlaps, issues. Pure — pass db slices.
 */
export function analyzeLeave({ employees, leaveRequests, settings }, { employeeId, type, from, to, excludeId }) {
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return null;
  const policies = policiesOf(settings);
  const count = countLeave(from, to);
  const bal = leaveBalance(emp, leaveRequests, excludeId, policies.accrual.cap);
  const consumes = type === "annual";
  const before = bal.remaining;
  const after = consumes ? before - count.working : before;

  const mates = employees.filter((e) => e.departmentId === emp.departmentId && e.id !== emp.id && isActiveEmployee(e));
  const mateIds = new Set(mates.map((e) => e.id));
  const hasRange = from && to && to >= from;
  const overlapping = (r) => hasRange && r.from <= to && r.to >= from && r.id !== excludeId;

  const teamOut = leaveRequests.filter((r) => mateIds.has(r.employeeId) && isConfirmed(r) && overlapping(r));
  const teamPending = leaveRequests.filter((r) => mateIds.has(r.employeeId) && r.status === "pending" && overlapping(r));
  const total = mates.length + 1;
  const workDays = hasRange ? listDays(from, to).slice(0, MAX_RANGE).filter((d) => !isWeekend(d) && !holidayOn(d)) : [];
  const perDay = workDays.map((d) => {
    const out = new Set(teamOut.filter((r) => r.from <= d && d <= r.to).map((r) => r.employeeId)).size;
    return { date: d, out, total, rate: (out + 1) / total };
  });
  const worst = perDay.reduce((m, x) => (x.rate > (m?.rate ?? 0) ? x : m), null);
  const overlaps = hasRange ? leaveRequests.filter((r) => r.employeeId === emp.id && ["pending", "approved", "taken"].includes(r.status) && overlapping(r)) : [];
  const history = leaveRequests.filter((r) => r.employeeId === emp.id && r.id !== excludeId && r.status !== "cancelled").sort((a, b) => b.from.localeCompare(a.from)).slice(0, 4);

  const issues = [];
  if (hasRange && count.working === 0) issues.push({ tone: "danger", text: "Aucun jour ouvré sur cette période." });
  if (overlaps.length) issues.push({ tone: "danger", text: "Chevauche une autre demande de ce salarié." });
  if (consumes && after < 0) issues.push({ tone: "warning", text: `Solde insuffisant : ${fmtDays(Math.abs(after))} passeront en sans solde.` });
  if (worst && worst.rate > CONFLICT_RATE) {
    issues.push({ tone: "warning", text: `Couverture : ${worst.out + 1} sur ${worst.total} absents dans le service le même jour (${Math.round(worst.rate * 100)} %).` });
  }
  const safe = !issues.some((i) => i.tone === "warning" || i.tone === "danger");
  return { emp, policies, count, balance: bal, before, after, consumes, mates, teamOut, teamPending, perDay, worst, overlaps, history, issues, safe, conflict: !!worst && worst.rate > CONFLICT_RATE };
}

/** Next working day on/after an ISO date (for sensible defaults). */
export function nextWorkingDay(iso) {
  let d = iso;
  for (let i = 0; i < 14; i++) {
    if (!isWeekend(d) && !holidayOn(d)) return d;
    d = addDays(d, 1);
  }
  return iso;
}
