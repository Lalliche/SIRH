// Pure helpers that build a payroll run on top of the verified engine (payroll.js).
// No React, no storage. Everything here is deterministic and unit-testable.
// Uncertain rules (cap on loan deductions, long sick leave handling, SNMG basis…) are flagged "à confirmer" in the UI.

import { computePayslip, defaultParams, grossToNet, irgMonthly } from "@/lib/payroll";
import { addDays, daysInMonth, diffDays, workingDays } from "@/lib/dates";

const round2 = (n) => Math.round(n * 100) / 100;
const sum = (list, pick) => list.reduce((s, x) => s + (pick(x) || 0), 0);

// ---------- periods ----------
export const periodStart = (p) => `${p}-01`;
export const periodEnd = (p) => `${p}-${String(daysInMonth(p)).padStart(2, "0")}`;
export function prevPeriod(p) {
  const [y, m] = p.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}
export function nextPeriod(p) {
  const [y, m] = p.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}
export const periodWorkingDays = (p) => workingDays(periodStart(p), periodEnd(p));
export const defaultPayDate = (p) => `${nextPeriod(p)}-05`;

// ---------- proration (hire / exit inside the period) ----------
export function workedDaysFor(employee, period) {
  const ps = periodStart(period);
  const pe = periodEnd(period);
  const contractual = periodWorkingDays(period);
  const from = employee.hireDate && employee.hireDate > ps ? employee.hireDate : ps;
  const to = employee.exitDate && employee.exitDate < pe ? employee.exitDate : pe;
  if (from > to) return { worked: 0, contractual };
  return { worked: Math.min(contractual, workingDays(from, to)), contractual };
}

export function isPayable(employee, period) {
  return employee.hireDate <= periodEnd(period) && !(employee.exitDate && employee.exitDate < periodStart(period));
}

/** scope = { entityIds: string[], departmentIds: string[] } — null/undefined means "everyone". */
export function employeesInScope(employees, period, scope) {
  return employees.filter(
    (e) =>
      isPayable(e, period) &&
      (!scope?.entityIds || scope.entityIds.includes(e.entityId)) &&
      (!scope?.departmentIds || scope.departmentIds.includes(e.departmentId)),
  );
}

// ---------- variables of the month (prefilled from leave / attendance / loans) ----------
export function unpaidLeaveDays(employeeId, period, leaveRequests) {
  const ps = periodStart(period);
  const pe = periodEnd(period);
  return leaveRequests
    .filter((l) => l.employeeId === employeeId && l.type === "unpaid" && ["approved", "taken"].includes(l.status) && l.from <= pe && l.to >= ps)
    .reduce((s, l) => s + workingDays(l.from < ps ? ps : l.from, l.to > pe ? pe : l.to), 0);
}

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Overtime hours = time worked after `endOfDay` (default 17:30), rounded to the hour over the month. */
export function overtimeHoursFromAttendance(records, endOfDay = "17:30") {
  const limit = toMinutes(endOfDay);
  const minutes = records.reduce((s, r) => (r.out ? s + Math.max(0, toMinutes(r.out) - limit) : s), 0);
  return Math.round(minutes / 60);
}

export function loanInstallment(employeeId, period, loans) {
  return loans
    .filter((l) => l.employeeId === employeeId && l.status === "active" && l.remaining > 0 && l.startDate.slice(0, 7) <= period)
    .reduce((s, l) => s + Math.min(l.monthly, l.remaining), 0);
}

// Variables already keyed by accounting for the current month (matches the audit log "3 primes ajoutées").
export const DEMO_VARIABLES = {
  "2026-10": {
    "emp-013": { prime: 30000, primeLabel: "Prime exceptionnelle", sources: { prime: "Saisi par L. Cherif le 25/10" } },
    "emp-016": { prime: 15000, primeLabel: "Prime de rendement", sources: { prime: "Saisi par L. Cherif le 25/10" } },
    "emp-023": { prime: 20000, primeLabel: "Prime de projet", sources: { prime: "Saisi par L. Cherif le 25/10" } },
    "emp-015": { overtimeHours: 14, sources: { overtime: "Saisi par L. Cherif le 25/10" } },
  },
};

export const EMPTY_VARS = { prime: 0, primeLabel: "", overtimeHours: 0, absenceDays: 0, otherDeductions: 0, loanDeduction: 0, sources: {} };

export function defaultVariables({ period, employees, leaveRequests = [], attendance = [], loans = [] }) {
  const ps = periodStart(period);
  const pe = periodEnd(period);
  const byEmp = {};
  for (const r of attendance) {
    if (r.date < ps || r.date > pe) continue;
    (byEmp[r.employeeId] ??= []).push(r);
  }
  const demo = DEMO_VARIABLES[period] ?? {};
  const out = {};
  for (const e of employees) {
    const recs = byEmp[e.id] ?? [];
    const unpaid = unpaidLeaveDays(e.id, period, leaveRequests);
    const absent = recs.filter((r) => r.status === "absent").length;
    const overtime = overtimeHoursFromAttendance(recs);
    const loan = loanInstallment(e.id, period, loans);
    const sources = {};
    if (unpaid) sources.absence = "Congé sans solde approuvé";
    if (absent && !unpaid) sources.absenceHint = `${absent} absence${absent > 1 ? "s" : ""} non justifiée${absent > 1 ? "s" : ""} au pointage, à examiner`;
    if (overtime) sources.overtime = "Pointage : au-delà de 17 h 30";
    if (loan) sources.loan = "Échéancier prêt / avance";
    out[e.id] = { ...EMPTY_VARS, absenceDays: unpaid, overtimeHours: overtime, loanDeduction: loan, sources, ...(demo[e.id] ?? {}) };
    if (demo[e.id]?.sources) out[e.id].sources = { ...sources, ...demo[e.id].sources };
  }
  return out;
}

export function mergeVariables(defaults, edits = {}) {
  const out = {};
  for (const id of Object.keys(defaults)) out[id] = { ...defaults[id], ...(edits[id] ?? {}) };
  return out;
}

// ---------- one payslip line ----------
export function buildLine(employee, vars = EMPTY_VARS, period, params = defaultParams) {
  const { worked, contractual } = workedDaysFor(employee, period);
  const absence = Math.min(Math.max(vars.absenceDays || 0, 0), worked);
  const paidDays = worked - absence;
  const ratio = contractual ? paidDays / contractual : 0;
  const components = (employee.components ?? []).map((c) => ({ ...c }));
  if (vars.prime > 0 && ratio > 0) {
    // computePayslip prorates every component; a one-off prime must not be prorated → pre-divide.
    components.push({ code: "prime", label: vars.primeLabel || "Prime exceptionnelle", amount: vars.prime / ratio, cotisable: true, imposable: true });
  }
  const overtime = vars.overtimeHours > 0 ? [{ hours: vars.overtimeHours, kind: "standard" }] : [];
  const slip = computePayslip(
    { baseSalary: employee.baseSalary, components, workedRatio: ratio, overtime, loanDeduction: vars.loanDeduction || 0, otherDeductions: vars.otherDeductions || 0 },
    params,
  );
  return {
    employeeId: employee.id,
    ...slip,
    ratio: Math.round(ratio * 10000) / 10000,
    workedDays: paidDays,
    contractualDays: contractual,
    absenceDays: absence,
    overtimeHours: vars.overtimeHours || 0,
    prime: vars.prime || 0,
  };
}

export function buildLines({ period, employees, variables, scope, params = defaultParams }) {
  return employeesInScope(employees, period, scope).map((e) => buildLine(e, variables[e.id] ?? EMPTY_VARS, period, params));
}

export const TOTAL_KEYS = ["gross", "cotisable", "cnasEmployee", "taxable", "irg", "loanDeduction", "otherDeductions", "net", "cnasEmployer", "fnpos", "employerCost"];

export function totalsOf(lines) {
  const t = {};
  for (const k of TOTAL_KEYS) t[k] = round2(sum(lines, (l) => l[k]));
  return t;
}

// ---------- diff vs previous run ----------
const compSum = (line, exclude) => sum((line.components ?? []).filter((c) => c.code !== exclude), (c) => c.amount);
const primeOf = (line) => sum((line.components ?? []).filter((c) => c.code === "prime"), (c) => c.amount);

/**
 * rows: [{ employeeId, kind: "entree"|"sortie"|"variation"|"stable", netPrev, netCur, delta, pct, reasons:[{code,label,amount?}] }]
 * sorted by absolute delta (largest movers first).
 */
export function diffLines(curLines, prevLines = [], employeesById = {}, period) {
  const prevMap = new Map(prevLines.map((l) => [l.employeeId, l]));
  const curMap = new Map(curLines.map((l) => [l.employeeId, l]));
  const ids = [...new Set([...curLines.map((l) => l.employeeId), ...prevLines.map((l) => l.employeeId)])];
  const rows = ids.map((id) => {
    const cur = curMap.get(id);
    const prv = prevMap.get(id);
    const emp = employeesById[id];
    const reasons = [];
    let kind = "variation";
    if (cur && !prv) {
      kind = "entree";
      reasons.push({ code: "entree", label: cur.ratio < 1 ? `Entrée · prorata ${cur.workedDays}/${cur.contractualDays} j` : "Entrée dans le périmètre" });
    } else if (!cur && prv) {
      kind = "sortie";
      reasons.push({ code: "sortie", label: emp?.exitDate ? `Sortie le ${emp.exitDate.split("-").reverse().join("/")}` : "Absent de la paie du mois" });
    } else {
      const prevRatio = prv.ratio ?? 1;
      if (Math.abs(cur.base - prv.base) > 0.5 && cur.ratio === prevRatio) reasons.push({ code: "base", label: "Salaire de base modifié" });
      const dPrime = primeOf(cur) - primeOf(prv);
      if (dPrime > 0.5) reasons.push({ code: "prime", label: "+ prime", amount: dPrime });
      else if (dPrime < -0.5) reasons.push({ code: "prime", label: "− prime", amount: dPrime });
      const dOt = cur.overtimePay - (prv.overtimePay ?? 0);
      if (dOt > 0.5) reasons.push({ code: "overtime", label: `+ heures sup. (${String(cur.overtimeHours).replace(".", ",")} h)`, amount: dOt });
      if ((cur.absenceDays ?? 0) > (prv.absenceDays ?? 0)) reasons.push({ code: "absence", label: `Absence ${cur.absenceDays} j non payée${cur.absenceDays > 1 ? "s" : ""}` });
      const dLoan = (cur.loanDeduction ?? 0) - (prv.loanDeduction ?? 0);
      if (Math.abs(dLoan) > 0.5) reasons.push({ code: "loan", label: dLoan > 0 ? "+ retenue prêt / avance" : "− retenue prêt / avance", amount: -dLoan });
      if (cur.ratio < 1 && prevRatio === 1 && !(cur.absenceDays > (prv.absenceDays ?? 0))) reasons.push({ code: "prorata", label: `Prorata ${cur.workedDays}/${cur.contractualDays} j` });
      if (Math.abs(compSum(cur, "prime") - compSum(prv, "prime")) > 0.5 && cur.ratio === prevRatio) reasons.push({ code: "indemnites", label: "Indemnités modifiées" });
    }
    const netCur = cur?.net ?? 0;
    const netPrev = prv?.net ?? 0;
    const delta = round2(netCur - netPrev);
    if (kind === "variation" && reasons.length === 0 && Math.abs(delta) > 1) reasons.push({ code: "autre", label: "Autre écart" });
    if (kind === "variation" && Math.abs(delta) <= 1 && reasons.length === 0) kind = "stable";
    return { employeeId: id, kind, netPrev, netCur, delta, pct: netPrev ? (delta / netPrev) * 100 : null, reasons, period };
  });
  return rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

// ---------- pre-flight rule engine ----------
export const VARIANCE_THRESHOLD = 15;
// Heures supplémentaires : plafond légal de 20 % de la durée normale (8 h sur une base de 40 h/semaine,
// soit ~34,67 h sur le mois à 173,33 h). Base légale : ordonnance n°97-03 du 11 janvier 1997 fixant la
// durée légale du travail (qui a abrogé les articles 22 à 26 de la loi 90-11 sur ce point — ne pas citer
// la loi 90-11 pour cette règle). Pourcentage confirmé par une source universitaire algérienne, mais pas
// par la lecture directe du Journal officiel [à confirmer].
export const OVERTIME_CAP_RATIO = 0.2;

export const PREFLIGHT_RULES = {
  missing_cnas: { label: "N° CNAS manquant", severity: "blocker", help: "Sans N° CNAS, la déclaration des cotisations est rejetée." },
  below_snmg: { label: "Salaire inférieur au SNMG", severity: "blocker", help: "Le salaire de base ne peut pas être inférieur au SNMG (temps plein). [à confirmer : base de comparaison]" },
  negative_net: { label: "Net à payer négatif", severity: "blocker", help: "Les retenues dépassent le net : revoir prêts et retenues." },
  new_hire: { label: "Nouveau salarié · prorata", severity: "info", help: "Salaire calculé au prorata des jours ouvrés depuis l'entrée." },
  exit_prorata: { label: "Sortie dans le mois · prorata", severity: "info", help: "Salaire calculé jusqu'à la date de sortie ; solde de tout compte à préparer." },
  cdd_ending: { label: "CDD arrivant à échéance", severity: "warning", help: "Renouveler par avenant ou préparer la sortie avant la date de fin." },
  cdd_expired: { label: "Contrat à durée déterminée échu", severity: "warning", help: "La date de fin est dépassée alors que le salarié est toujours payé : avenant manquant ?" },
  variance: { label: `Écart > ${VARIANCE_THRESHOLD} % vs mois précédent`, severity: "warning", help: "Vérifier primes, heures supplémentaires, absences et prorata." },
  missing_rib: { label: "RIB manquant", severity: "warning", help: "Le salarié sera exclu du fichier de virement." },
  missing_nin: { label: "NIN manquant ou incomplet", severity: "warning", help: "Le NIN de chaque salarié est requis pour le G29 (loi de finances 2026). [à confirmer]" },
  sick_long: { label: "Arrêt maladie prolongé", severity: "warning", help: "Indemnités journalières CNAS et maintien de salaire à traiter. [à confirmer]" },
  loan_cap: { label: "Retenue prêt / avance élevée", severity: "warning", help: "La retenue dépasse le tiers du net avant retenues. [à confirmer : fraction saisissable]" },
  duplicate_rib: { label: "RIB en double", severity: "blocker", help: "Deux salariés partagent le même compte : risque d'erreur de virement." },
  overtime_cap: { label: "Heures supplémentaires au-delà du plafond légal", severity: "warning", help: `Le plafond légal est de ${Math.round(OVERTIME_CAP_RATIO * 100)} % de la durée normale, soit environ ${Math.round(defaultParams.hoursPerMonth * OVERTIME_CAP_RATIO)} h sur le mois. [à confirmer]` },
};
export const PREFLIGHT_ORDER = Object.keys(PREFLIGHT_RULES);

/**
 * Returns { issues, byRule } — issues: [{ id, rule, severity, employeeId, title, detail, fix }]
 * `employees` must be the employees in scope (with their lines).
 */
export function runPreflight({ period, employees, lines, prevLines = [], leaveRequests = [], params = defaultParams, today }) {
  const ps = periodStart(period);
  const pe = periodEnd(period);
  const lineMap = new Map(lines.map((l) => [l.employeeId, l]));
  const prevMap = new Map(prevLines.map((l) => [l.employeeId, l]));
  const issues = [];
  const add = (rule, e, title, detail, fix) =>
    issues.push({ id: `${rule}:${e.id}`, rule, severity: PREFLIGHT_RULES[rule].severity, employeeId: e.id, title, detail, fix });
  const fixTo = (e, tab, label = "Corriger") => ({ href: `/app/employees/${e.id}?tab=${tab}`, label });

  const ribCount = {};
  for (const e of employees) if (e.rib) ribCount[e.rib] = (ribCount[e.rib] || 0) + 1;

  for (const e of employees) {
    const line = lineMap.get(e.id);
    if (!line) continue;
    if (!String(e.cnasNumber ?? "").trim()) add("missing_cnas", e, "N° CNAS manquant", "Renseigner le numéro d'immatriculation CNAS du salarié.", fixTo(e, "overview"));
    if (e.baseSalary < params.snmg)
      add("below_snmg", e, "Salaire inférieur au SNMG", `Base ${fmt(e.baseSalary)} DA pour un SNMG de ${fmt(params.snmg)} DA : écart de ${fmt(params.snmg - e.baseSalary)} DA.`, fixTo(e, "pay", "Corriger le salaire"));
    if (line.net < 0) add("negative_net", e, "Net à payer négatif", `Net calculé : ${fmt(line.net)} DA.`, fixTo(e, "pay"));
    if (e.hireDate >= ps && e.hireDate <= pe) add("new_hire", e, "Nouveau salarié · prorata", `Entré le ${dmy(e.hireDate)} : ${line.workedDays} j payés sur ${line.contractualDays}.`, fixTo(e, "contract", "Vérifier la date"));
    if (e.exitDate && e.exitDate >= ps && e.exitDate <= pe) add("exit_prorata", e, "Sortie dans le mois · prorata", `Sortie le ${dmy(e.exitDate)} : ${line.workedDays} j payés sur ${line.contractualDays}.`, fixTo(e, "contract"));
    const end = e.contract?.endDate;
    if (end && e.contract.type !== "CDI") {
      if (end >= ps && end <= addDays(pe, 45)) {
        const d = diffDays(today, end);
        add("cdd_ending", e, `${e.contract.type} se termine le ${dmy(end)}`, d >= 0 ? `Dans ${d} jour${d > 1 ? "s" : ""} : renouveler par avenant ou préparer la sortie.` : "Date de fin dépassée dans le mois.", fixTo(e, "contract", "Ouvrir le contrat"));
      } else if (end < ps) {
        add("cdd_expired", e, `${e.contract.type} échu le ${dmy(end)}`, "Toujours payé sans avenant enregistré.", fixTo(e, "contract", "Ouvrir le contrat"));
      }
    }
    const prv = prevMap.get(e.id);
    if (prv && prv.net > 0) {
      const pct = ((line.net - prv.net) / prv.net) * 100;
      if (Math.abs(pct) > VARIANCE_THRESHOLD) {
        add("variance", e, `Net ${pct > 0 ? "+" : "−"}${Math.abs(pct).toFixed(1).replace(".", ",")} % vs mois précédent`, `${fmt(prv.net)} → ${fmt(line.net)} DA. Ouvrir le tableau des écarts pour le détail.`, { href: `#ecarts`, label: "Voir l'écart" });
      }
    }
    if (!String(e.rib ?? "").trim()) add("missing_rib", e, "RIB manquant", "Aucun compte bancaire : exclu du fichier de virement.", fixTo(e, "pay"));
    else if (ribCount[e.rib] > 1) add("duplicate_rib", e, "RIB en double", "Ce RIB est utilisé par un autre salarié.", fixTo(e, "pay"));
    if (!String(e.nin ?? "").trim() || String(e.nin).length < 18) add("missing_nin", e, "NIN manquant ou incomplet", "18 chiffres attendus pour le G29.", fixTo(e, "overview"));
    const sickDays = leaveRequests
      .filter((l) => l.employeeId === e.id && l.type === "sick" && ["approved", "taken"].includes(l.status) && l.from <= pe && l.to >= ps)
      .reduce((s, l) => s + workingDays(l.from < ps ? ps : l.from, l.to > pe ? pe : l.to), 0);
    if (sickDays >= 10) add("sick_long", e, `Arrêt maladie de ${sickDays} jours ouvrés`, "Indemnités CNAS et maintien de salaire à traiter manuellement.", { href: `/app/leave`, label: "Voir le congé" });
    const preLoanNet = line.gross - line.cnasEmployee - line.irg;
    if (line.loanDeduction > 0 && line.loanDeduction > preLoanNet / 3) add("loan_cap", e, "Retenue prêt / avance élevée", `${fmt(line.loanDeduction)} DA pour un net avant retenue de ${fmt(preLoanNet)} DA.`, { href: "/app/loans", label: "Voir le prêt" });
    const overtimeCapHours = params.hoursPerMonth * OVERTIME_CAP_RATIO;
    if ((line.overtimeHours || 0) > overtimeCapHours) {
      add(
        "overtime_cap",
        e,
        `${fmt(line.overtimeHours)} h supplémentaires ce mois`,
        `Au-delà du plafond légal d'environ ${Math.round(overtimeCapHours)} h (${Math.round(OVERTIME_CAP_RATIO * 100)} % de la durée normale).`,
        fixTo(e, "time", "Vérifier le pointage"),
      );
    }
  }
  const byRule = {};
  for (const rule of PREFLIGHT_ORDER) byRule[rule] = issues.filter((i) => i.rule === rule);
  return { issues, byRule };
}

const fmt = (n) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n));
const dmy = (iso) => iso.split("-").reverse().join("/");

/** Counts of unresolved issues once acknowledged ones (with a motive) are removed. */
export function preflightSummary(issues, acks = {}) {
  const open = issues.filter((i) => !acks[i.id]);
  return {
    blockers: open.filter((i) => i.severity === "blocker").length,
    warnings: open.filter((i) => i.severity === "warning").length,
    infos: open.filter((i) => i.severity === "info").length,
    ignored: issues.length - open.length,
  };
}

// ---------- IRG detail (for "show your math") ----------
export function irgBreakdown(taxable, p = defaultParams) {
  const base = p.irgRoundTo10 ? Math.floor(taxable / 10) * 10 : taxable;
  if (base <= p.irgExemptUpTo) return { base, exempt: true, slices: [], tax: 0, abattement: 0, irg1: 0, smoothed: false, irg: 0 };
  const slices = [];
  let tax = 0;
  let lower = 0;
  for (const { upTo, rate } of p.irgBracketsMonthly) {
    if (base > lower) {
      const part = Math.min(base, upTo) - lower;
      slices.push({ from: lower, to: Math.min(base, upTo), rate, amount: part * rate });
      tax += part * rate;
    }
    lower = upTo;
  }
  const { rate, min, max } = p.abattement;
  const abattement = Math.min(max, Math.max(min, tax * rate));
  const irg1 = Math.max(0, tax - abattement);
  const smoothed = base <= p.irgSmoothingUpTo;
  const irg = smoothed ? Math.max(0, (irg1 * 137) / 51 - 27925 / 8) : irg1;
  return { base, exempt: false, slices, tax, abattement, irg1, smoothed, irg };
}
export { irgMonthly };

// ---------- what-if simulator ----------
export const DEFAULT_SCENARIO = { base: 80000, raisePct: 0, prime: 0, panier: 4000, panierCotisable: true, panierImposable: true };

export function simulate(s, p = defaultParams) {
  const baseSalary = s.base * (1 + (s.raisePct || 0) / 100);
  const components = [];
  if (s.prime > 0) components.push({ code: "prime", label: "Prime", amount: s.prime, cotisable: true, imposable: true });
  if (s.panier > 0) components.push({ code: "panier", label: "Indemnité de panier", amount: s.panier, cotisable: s.panierCotisable !== false, imposable: s.panierImposable !== false });
  return computePayslip({ baseSalary, components }, p);
}

/** Which base salary gives the target net, everything else equal? Net is monotonic in base → bisection. */
export function solveBaseForNet(targetNet, scenario, p = defaultParams) {
  let lo = 0;
  let hi = Math.max(targetNet * 4, 100000);
  for (let i = 0; i < 70; i++) {
    const mid = (lo + hi) / 2;
    if (simulate({ ...scenario, base: mid, raisePct: 0 }, p).net < targetNet) lo = mid;
    else hi = mid;
    if (hi - lo < 0.25) break;
  }
  return round2((lo + hi) / 2);
}

/** Share of an extra `step` DA of gross that reaches the employee's pocket around `gross`. */
export function marginalTakeHome(gross, p = defaultParams, step = 1000) {
  const a = grossToNet(gross, p).net;
  const b = grossToNet(gross + step, p).net;
  return (b - a) / step;
}

// ---------- SNMG change impact (compliance) ----------
export function snmgImpact(employees, newSnmg, p = defaultParams) {
  const rows = [];
  for (const e of employees) {
    if (e.status === "sorti" || e.baseSalary >= newSnmg) continue;
    const before = computePayslip({ baseSalary: e.baseSalary, components: e.components ?? [] }, p);
    const after = computePayslip({ baseSalary: newSnmg, components: e.components ?? [] }, p);
    rows.push({ employeeId: e.id, from: e.baseSalary, to: newSnmg, deltaGross: round2(after.gross - before.gross), deltaEmployerCost: round2(after.employerCost - before.employerCost), deltaNet: round2(after.net - before.net) });
  }
  return { rows, count: rows.length, deltaGross: round2(sum(rows, (r) => r.deltaGross)), deltaEmployerCost: round2(sum(rows, (r) => r.deltaEmployerCost)) };
}

// ---------- year-to-date and payslip lookup ----------
export const PAID_STATUSES = ["validated", "paid", "declared", "closed"];

export function payslipsOf(employeeId, runs) {
  return runs
    .filter((r) => PAID_STATUSES.includes(r.status))
    .map((r) => ({ run: r, line: r.lines.find((l) => l.employeeId === employeeId) }))
    .filter((x) => x.line)
    .sort((a, b) => b.run.period.localeCompare(a.run.period));
}

export function ytdFor(employeeId, period, runs) {
  const year = period.slice(0, 4);
  const acc = { gross: 0, cotisable: 0, taxable: 0, cnasEmployee: 0, irg: 0, net: 0, count: 0 };
  for (const r of runs) {
    if (!PAID_STATUSES.includes(r.status) || r.period.slice(0, 4) !== year || r.period > period) continue;
    const l = r.lines.find((x) => x.employeeId === employeeId);
    if (!l) continue;
    for (const k of ["gross", "cotisable", "taxable", "cnasEmployee", "irg", "net"]) acc[k] += l[k] ?? 0;
    acc.count += 1;
  }
  for (const k of Object.keys(acc)) acc[k] = k === "count" ? acc[k] : round2(acc[k]);
  return acc;
}

// ---------- severance (indemnité de licenciement) ----------
// Loi n°90-11 du 21 avril 1990, article 72 : 1 mois de salaire par année de travail, plafonné à 15 mois,
// calculé sur la moyenne mensuelle la plus favorable des 3 dernières années. Ne s'applique pas en cas de
// faute grave (art. 73 : aucune indemnité) ni, en principe, de démission ou de fin de CDD — motifs non
// éligibles ci-dessous. Source : texte consolidé de la loi 90-11 (OMPI/WIPO Lex) ; confirmé par une
// seconde source indépendante, mais la base légale n'a pas été lue directement au Journal officiel.
export const SEVERANCE_MONTHS_CAP = 15;
export const SEVERANCE_ELIGIBLE_REASONS = ["Licenciement", "Rupture conventionnelle"];
export const SEVERANCE_NOT_ELIGIBLE = {
  "Démission": "Le salarié démissionnaire n'a pas droit à l'indemnité de licenciement (art. 72).",
  "Abandon de poste": "Assimilé à une faute grave : aucune indemnité de licenciement due (art. 73).",
  "Fin de période d'essai": "La rupture pendant la période d'essai n'ouvre droit à aucune indemnité.",
  "Fin de CDD": "Le CDD suit son propre régime de fin de contrat, distinct de l'indemnité de licenciement.",
  "Retraite": "Le départ à la retraite relève d'un régime distinct (CNR), non de l'indemnité de licenciement. [à confirmer]",
};

/**
 * Indemnité de licenciement (solde de tout compte, art. 72 loi 90-11) — prototype.
 * yearsOfService : années complètes depuis hireDate. monthlyAverage : moyenne mensuelle la plus
 * favorable des 3 dernières années — ici calculée sur l'historique de paie disponible (potentiellement
 * moins de 3 ans dans ce prototype), avec repli explicite sur le salaire de base actuel si l'historique
 * est insuffisant, pour rester honnête sur la limite des données plutôt que de deviner.
 */
export function severanceIndemnity({ employee, runs, exitReason, exitDate }) {
  const eligible = SEVERANCE_ELIGIBLE_REASONS.includes(exitReason);
  const blockedReason = SEVERANCE_NOT_ELIGIBLE[exitReason];
  const years = Math.floor(monthsBetween(employee.hireDate, exitDate ?? employee.exitDate) / 12);

  const history = payslipsOf(employee.id, runs).map((x) => x.line.net);
  const basedOnHistory = history.length > 0;
  const monthlyAverage = basedOnHistory ? round2(sum(history, (v) => v) / history.length) : employee.baseSalary;

  const monthsOwed = Math.min(years, SEVERANCE_MONTHS_CAP);
  const amount = eligible ? round2(monthsOwed * monthlyAverage) : 0;

  return {
    eligible,
    blockedReason,
    years,
    monthsOwed,
    monthlyAverage,
    basedOnHistory, // false => repli sur le salaire de base, historique de paie insuffisant
    amount,
  };
}

function monthsBetween(from, to) {
  if (!from || !to) return 0;
  const [y1, m1] = from.split("-").map(Number);
  const [y2, m2] = to.split("-").map(Number);
  return Math.max(0, (y2 - y1) * 12 + (m2 - m1));
}

// ---------- declarations summary ----------
export const DECLARATION_KINDS = {
  G50: { label: "G50", long: "Déclaration mensuelle des retenues (DGI)", cadence: "mensuelle", note: "À déposer avant le 20 du mois suivant [à confirmer]" },
  CNAS: { label: "CNAS mensuel", long: "Déclaration des cotisations CNAS", cadence: "mensuelle", note: "Échéance mensuelle ou trimestrielle selon le régime [à confirmer]" },
  G29: { label: "G29 / 301 bis", long: "Déclaration annuelle des salaires (DGI)", cadence: "annuelle", note: "Avant le 30 avril ; NIN requis dès la loi de finances 2026" },
  DAS: { label: "DAS", long: "Déclaration annuelle des salaires (CNAS)", cadence: "annuelle", note: "Date limite non confirmée [à confirmer]" },
};

/** One row per employee; for annual declarations rows are cumulated over the year's runs. */
export function declarationRows(kind, period, runs, employeesById) {
  const annual = DECLARATION_KINDS[kind]?.cadence === "annuelle";
  const relevant = runs.filter((r) => PAID_STATUSES.includes(r.status) && (annual ? r.period.slice(0, 4) === period : r.period === period));
  const acc = new Map();
  for (const r of relevant) {
    for (const l of r.lines) {
      const cur = acc.get(l.employeeId) ?? { employeeId: l.employeeId, gross: 0, cotisable: 0, cnasEmployee: 0, taxable: 0, irg: 0 };
      cur.gross += l.gross;
      cur.cotisable += l.cotisable;
      cur.cnasEmployee += l.cnasEmployee;
      cur.taxable += l.taxable;
      cur.irg += l.irg;
      acc.set(l.employeeId, cur);
    }
  }
  const rows = [...acc.values()].map((r) => {
    const e = employeesById[r.employeeId];
    return {
      ...r,
      matricule: e?.matricule ?? "—",
      name: e ? `${e.firstName} ${e.lastName}` : r.employeeId,
      nin: e?.nin ?? "",
      cnasNumber: e?.cnasNumber ?? "",
      gross: round2(r.gross),
      cotisable: round2(r.cotisable),
      cnasEmployee: round2(r.cnasEmployee),
      taxable: round2(r.taxable),
      irg: round2(r.irg),
    };
  });
  rows.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return { rows, runCount: relevant.length, totals: { gross: round2(sum(rows, (r) => r.gross)), cotisable: round2(sum(rows, (r) => r.cotisable)), cnasEmployee: round2(sum(rows, (r) => r.cnasEmployee)), taxable: round2(sum(rows, (r) => r.taxable)), irg: round2(sum(rows, (r) => r.irg)) } };
}

// ---------- bank transfer (mock) ----------
/** One row per payable employee with a RIB; employees without RIB are returned in `excluded`. */
export function bankTransferRows(run, employeesById) {
  const rows = [];
  const excluded = [];
  for (const l of run.lines) {
    const e = employeesById[l.employeeId];
    if (!e || l.net <= 0) continue;
    if (!e.rib) {
      excluded.push(e.id);
      continue;
    }
    rows.push({ matricule: e.matricule, name: `${e.lastName} ${e.firstName}`, rib: e.rib, amount: l.net, label: `Salaire ${run.period}` });
  }
  return { rows, excluded, total: round2(sum(rows, (r) => r.amount)) };
}
