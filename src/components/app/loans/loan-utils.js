// Pure loan helpers (échéancier, règle du tiers du net). Rates/caps flagged "à confirmer" in the UI.
import { computePayslip } from "@/lib/payroll";
import { CURRENT_PERIOD } from "@/lib/clock";
import { shiftPeriod } from "@/components/app/leave/leave-utils";

export const LOAN_TYPES = {
  avance: { label: "Avance sur salaire", short: "Avance" },
  pret_social: { label: "Prêt social", short: "Prêt social" },
};

export const LOAN_STATUS = {
  pending: { label: "En attente", tone: "warning" },
  active: { label: "En cours", tone: "brand" },
  closed: { label: "Soldé", tone: "success" },
  rejected: { label: "Refusé", tone: "danger" },
};

export const DEDUCTION_CAP = 1 / 3; // mensualités ≤ 1/3 du net [à confirmer : quotité saisissable]
export const MAX_SOCIAL_MULTIPLE = 10; // prêt social ≤ 10 × net [à confirmer, politique interne]

export function netOf(employee) {
  if (!employee) return 0;
  return computePayslip({ baseSalary: employee.baseSalary, components: employee.components }).net;
}

export const monthsFor = (total, monthly) => (monthly > 0 ? Math.ceil(total / monthly) : 0);
export const lastInstallment = (total, monthly) => {
  const n = monthsFor(total, monthly);
  return n ? Math.round((total - monthly * (n - 1)) * 100) / 100 : 0;
};

/** Monthly deductions already running for an employee (active loans), optionally excluding one loan. */
export function activeMonthly(loans, employeeId, excludeId) {
  return loans.filter((l) => l.employeeId === employeeId && l.status === "active" && l.id !== excludeId).reduce((s, l) => s + Math.min(l.monthly, l.remaining), 0);
}

/** Verdict for the "≤ 1/3 du net" rule. */
export function capacity(employee, loans, monthly, excludeId) {
  const net = netOf(employee);
  const cap = net * DEDUCTION_CAP;
  const existing = activeMonthly(loans, employee?.id, excludeId);
  const total = existing + monthly;
  return { net, cap, existing, total, room: Math.max(0, cap - existing), ok: total <= cap + 0.01 };
}

/** Repayment schedule. Paid installments are derived from remaining; first due month = startDate's month. */
export function buildSchedule(loan) {
  const n = monthsFor(loan.total, loan.monthly);
  const paid = loan.status === "closed" ? n : Math.min(n, Math.round((loan.total - loan.remaining) / loan.monthly));
  const start = loan.startDate.slice(0, 7);
  let balance = loan.total;
  return Array.from({ length: n }, (_, i) => {
    const amount = i === n - 1 ? lastInstallment(loan.total, loan.monthly) : loan.monthly;
    balance = Math.round((balance - amount) * 100) / 100;
    const period = shiftPeriod(start, i);
    const status = i < paid ? "paid" : loan.status === "active" && period <= CURRENT_PERIOD ? "due" : "upcoming";
    return { n: i + 1, period, amount, balance: Math.max(0, balance), status };
  });
}

export const INSTALLMENT_STATUS = {
  paid: { label: "Prélevée", tone: "success" },
  due: { label: "À prélever", tone: "warning" },
  upcoming: { label: "À venir", tone: "neutral" },
};
