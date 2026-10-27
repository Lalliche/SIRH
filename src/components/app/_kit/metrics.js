// Pure HR analytics derived from the db collections. Shared by Reports and People pulse.
import { TODAY, CURRENT_PERIOD } from "@/lib/clock";
import { addDays, diffDays, isWeekend, holidayOn, listDays } from "@/lib/dates";
import { computePayslip, defaultParams } from "@/lib/payroll";

export const isActive = (e) => e.status !== "sorti";
export const ageOf = (e) => Math.floor(diffDays(e.birthDate, TODAY) / 365.25);
export const tenureOf = (e) => diffDays(e.hireDate, TODAY) / 365.25;
export const pct = (n, d, digits = 1) => (d ? Math.round((n / d) * 10 ** (digits + 2)) / 10 ** digits : 0);
export const clamp = (n, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

export const TENURE_BUCKETS = [
  { label: "< 1 an", min: 0, max: 1 },
  { label: "1 à 3 ans", min: 1, max: 3 },
  { label: "3 à 5 ans", min: 3, max: 5 },
  { label: "5 à 10 ans", min: 5, max: 10 },
  { label: "10 ans et +", min: 10, max: Infinity },
];
export const AGE_BUCKETS = [
  { label: "< 25 ans", min: 0, max: 25 },
  { label: "25–34 ans", min: 25, max: 35 },
  { label: "35–44 ans", min: 35, max: 45 },
  { label: "45–54 ans", min: 45, max: 55 },
  { label: "55 ans et +", min: 55, max: Infinity },
];
export const bucketize = (values, buckets) =>
  buckets.map((b) => ({ label: b.label, value: values.filter((v) => v >= b.min && v < b.max).length }));

// ---------- attendance ----------
const toMin = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
/** Hours worked beyond 8 h (1 h lunch break deducted). */
export function overtimeOf(rec) {
  const a = toMin(rec.in);
  const b = toMin(rec.out);
  if (a == null || b == null) return 0;
  return Math.max(0, (b - a) / 60 - 1 - 8);
}

const workingList = (from, to) => listDays(from, to).filter((d) => !isWeekend(d) && !holidayOn(d));

/** Stats over [from, to] for a set of employee ids. Rates are percentages. */
export function attendanceStats({ attendance, leaveRequests }, ids, from, to) {
  const days = workingList(from, to);
  const daySet = new Set(days);
  let present = 0, late = 0, absent = 0, overtime = 0;
  for (const r of attendance) {
    if (!ids.has(r.employeeId) || !daySet.has(r.date)) continue;
    if (r.status === "absent") absent += 1;
    else if (r.status === "late") late += 1;
    else if (r.status === "present" || r.status === "remote" || r.status === "mission") present += 1;
    overtime += overtimeOf(r);
  }
  let sick = 0;
  for (const l of leaveRequests) {
    if (l.type !== "sick" || !ids.has(l.employeeId) || !["approved", "taken"].includes(l.status)) continue;
    sick += days.filter((d) => d >= l.from && d <= l.to).length;
  }
  const expected = ids.size * days.length;
  const worked = present + late;
  return {
    days: days.length,
    expected,
    absentDays: absent + sick,
    absentRate: pct(absent + sick, expected),
    lateRate: pct(late, worked),
    overtimeHours: Math.round(overtime * 10) / 10,
    overtimePerPerson: ids.size ? Math.round((overtime / ids.size) * 10) / 10 : 0,
  };
}

/** Three weekly buckets (oldest → newest) over the 21 days of attendance history. */
export function weeklyBuckets() {
  return [
    { label: "S-2", from: addDays(TODAY, -20), to: addDays(TODAY, -14) },
    { label: "S-1", from: addDays(TODAY, -13), to: addDays(TODAY, -7) },
    { label: "Cette sem.", from: addDays(TODAY, -6), to: TODAY },
  ];
}

// ---------- people ----------
export function headcountAt(employees, iso) {
  return employees.filter((e) => e.hireDate <= iso && (!e.exitDate || e.exitDate > iso)).length;
}

export function monthEnds(n) {
  const [y, m] = CURRENT_PERIOD.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const k = n - 1 - i;
    const mm = m - k;
    const yy = y + Math.floor((mm - 1) / 12);
    const mo = ((((mm - 1) % 12) + 12) % 12) + 1;
    const key = `${yy}-${String(mo).padStart(2, "0")}`;
    return { key, end: k === 0 ? TODAY : `${key}-${String(new Date(Date.UTC(yy, mo, 0)).getUTCDate()).padStart(2, "0")}` };
  });
}

/** Exits in the 12 months before TODAY / average headcount (%). */
export function turnoverRate(employees) {
  const from = addDays(TODAY, -365);
  const exits = employees.filter((e) => e.exitDate && e.exitDate > from && e.exitDate <= TODAY).length;
  const avg = (headcountAt(employees, from) + headcountAt(employees, TODAY)) / 2;
  return { exits, rate: pct(exits, avg) };
}

export const CONTRACT_RISK = {
  expired: { label: "Contrat expiré", tone: "danger" },
  ending30: { label: "Échéance sous 30 j", tone: "warning" },
  ending50: { label: "Échéance sous 60 j", tone: "info" },
  trial: { label: "Fin de période d'essai", tone: "info" },
};

export function riskyContracts(employees, horizon = 60) {
  const out = [];
  for (const e of employees.filter(isActive)) {
    const end = e.contract?.endDate;
    if (end) {
      const d = diffDays(TODAY, end);
      if (d < 0) out.push({ employee: e, kind: "expired", date: end, days: d });
      else if (d <= horizon) out.push({ employee: e, kind: d <= 30 ? "ending30" : "ending50", date: end, days: d });
    }
    const trial = e.contract?.trialEnd;
    if (trial) {
      const d = diffDays(TODAY, trial);
      if (d >= 0 && d <= 30) out.push({ employee: e, kind: "trial", date: trial, days: d });
    }
  }
  return out.sort((a, b) => a.days - b.days);
}

export const MISSING_FIELDS = [
  ["cnasNumber", "N° CNAS"],
  ["nin", "NIN"],
  ["rib", "RIB"],
  ["phone", "Téléphone"],
  ["address", "Adresse"],
];
export function incompleteFiles(employees) {
  return employees
    .filter(isActive)
    .map((e) => ({ employee: e, missing: MISSING_FIELDS.filter(([k]) => !String(e[k] ?? "").trim()).map(([, l]) => l) }))
    .filter((x) => x.missing.length);
}

// ---------- payroll ----------
export function payrollSeries(runs, n = 6) {
  return [...runs]
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-n)
    .map((r) => ({ period: r.period, gross: r.totals.gross, net: r.totals.net, employerCost: r.totals.employerCost, headcount: r.headcount }));
}

const STEPS_DONE = { draft: 1, computed: 2, validated: 3, paid: 4, declared: 5, closed: 5, error: 1 };
/** 0–100, never above 100. 5 steps: variables → calcul → validation → paiement → déclarations. */
export function payrollProgress(runs, period = CURRENT_PERIOD) {
  const run = runs.find((r) => r.period === period);
  const done = run ? STEPS_DONE[run.status] ?? 0 : 0;
  return { run, done, total: 5, value: Math.min(100, Math.round((done / 5) * 100)) };
}

/** Projected payroll for the current month from live employee records. */
export function forecastPayroll(employees, params = defaultParams) {
  let gross = 0, employerCost = 0, net = 0;
  for (const e of employees.filter(isActive)) {
    const ratio = e.hireDate > `${CURRENT_PERIOD}-01` ? 0.6 : 1;
    const s = computePayslip({ baseSalary: e.baseSalary, components: e.components, workedRatio: ratio }, params);
    gross += s.gross;
    employerCost += s.employerCost;
    net += s.net;
  }
  return { gross: Math.round(gross), employerCost: Math.round(employerCost), net: Math.round(net) };
}

export function belowSnmg(employees, params = defaultParams) {
  return employees.filter((e) => isActive(e) && e.baseSalary < params.snmg);
}

/** Employees led by `managerId` through department headship or direct reporting. */
export function teamOf(employees, departments, managerId) {
  const led = new Set(departments.filter((d) => d.headId === managerId).map((d) => d.id));
  return employees.filter((e) => isActive(e) && e.id !== managerId && (e.managerId === managerId || led.has(e.departmentId)));
}

// ---------- deterministic pseudo-random for mock survey / read receipts ----------
export function hashUnit(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}
/** Mock eNPS (-100…100) — labelled "enquête simulée" in the UI. */
export const mockEnps = (key) => Math.round(-8 + hashUnit(`enps:${key}`) * 62);
