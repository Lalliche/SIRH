// Unified, role-scoped queue of everything awaiting a decision. Pure builders; hooks live in use-pending.js.
import { CalendarDays, Fingerprint, HandCoins, MessageSquarePlus } from "lucide-react";
import { LEAVE_TYPES, REQUEST_KINDS } from "@/data/constants";
import { TODAY } from "@/lib/clock";
import { addDays, diffDays } from "@/lib/dates";
import { dateShort, money } from "@/lib/format";
import { analyzeLeave, fmtDays } from "@/components/app/leave/leave-utils";
import { approvableEmployees } from "@/components/app/leave/scope";
import { LOAN_TYPES, capacity, monthsFor } from "@/components/app/loans/loan-utils";

export const KIND_META = {
  leave: { label: "Congés", single: "Congé", icon: CalendarDays },
  loan: { label: "Prêts", single: "Prêt", icon: HandCoins },
  request: { label: "Demandes", single: "Demande", icon: MessageSquarePlus },
  correction: { label: "Pointage", single: "Pointage", icon: Fingerprint },
};

export function ageLabel(iso) {
  const n = diffDays(iso, TODAY);
  if (n <= 0) return "Aujourd'hui";
  if (n === 1) return "Hier";
  return `Il y a ${n} j`;
}

/** Cheap pass: only ids, kinds and owners — enough for the sidebar badge. */
export function listPending(state, user) {
  const scope = new Set(approvableEmployees(user.role, user.employeeId, state.employees).map((e) => e.id));
  if (!scope.size) return [];
  const out = [];
  state.leaveRequests.forEach((r) => r.status === "pending" && scope.has(r.employeeId) && out.push({ kind: "leave", id: r.id, employeeId: r.employeeId, createdAt: r.createdAt }));
  state.requests.forEach((r) => r.status === "pending" && scope.has(r.employeeId) && out.push({ kind: "request", id: r.id, employeeId: r.employeeId, createdAt: r.createdAt }));
  state.loans.forEach((l) => l.status === "pending" && scope.has(l.employeeId) && out.push({ kind: "loan", id: l.id, employeeId: l.employeeId, createdAt: l.requestedAt ?? addDays(l.startDate, -9) }));
  state.attendance.forEach((a) => a.correction?.status === "pending" && scope.has(a.employeeId) && out.push({ kind: "correction", id: a.id, employeeId: a.employeeId, createdAt: a.correction.requestedAt ?? a.date }));
  return out;
}

export function buildInboxItems(state, user) {
  const byId = Object.fromEntries(state.employees.map((e) => [e.id, e]));
  const items = listPending(state, user).map((p) => {
    const employee = byId[p.employeeId];
    const base = { key: `${p.kind}:${p.id}`, kind: p.kind, id: p.id, employee, createdAt: p.createdAt, issues: [] };

    if (p.kind === "leave") {
      const r = state.leaveRequests.find((x) => x.id === p.id);
      const a = analyzeLeave(state, { employeeId: r.employeeId, type: r.type, from: r.from, to: r.to, excludeId: r.id });
      const issues = a ? [...a.issues] : [];
      if (a?.count.holidays.length) issues.push({ tone: "info", text: `Recoupe un jour férié : ${a.count.holidays[0].label}.` });
      return { ...base, raw: r, title: LEAVE_TYPES[r.type]?.label ?? "Congé", subtitle: `${dateShort(r.from)} → ${dateShort(r.to)} · ${fmtDays(r.days)}`, issues };
    }
    if (p.kind === "loan") {
      const l = state.loans.find((x) => x.id === p.id);
      const cap = capacity(employee, state.loans, l.monthly, l.id);
      const issues = [];
      if (!cap.ok) issues.push({ tone: "warning", text: "Mensualités cumulées au-delà du tiers du net." });
      if (cap.existing > 0) issues.push({ tone: "info", text: "Un prêt ou une avance est déjà en cours de remboursement." });
      return { ...base, raw: l, cap, title: `${LOAN_TYPES[l.type]?.short ?? "Prêt"} · ${money(l.total, { decimals: 0 })}`, subtitle: `${money(l.monthly, { decimals: 0 })} × ${monthsFor(l.total, l.monthly)} mois`, issues };
    }
    if (p.kind === "request") {
      const r = state.requests.find((x) => x.id === p.id);
      const issues = [];
      if (r.kind === "avance") {
        const cap = capacity(employee, state.loans, Math.ceil((r.amount || 0) / (r.months || 6) / 100) * 100);
        if (cap.existing > 0) issues.push({ tone: "warning", text: "Une avance ou un prêt est déjà en cours de remboursement." });
        if (r.amount && !cap.ok) issues.push({ tone: "warning", text: "Mensualité au-delà du tiers du net." });
      }
      const amount = r.kind === "avance" && r.amount ? ` · ${money(r.amount, { decimals: 0 })}` : "";
      return { ...base, raw: r, title: REQUEST_KINDS[r.kind] ?? "Demande", subtitle: (r.note || "Sans précision") + amount, issues };
    }
    const a = state.attendance.find((x) => x.id === p.id);
    return { ...base, raw: a, title: "Correction de pointage", subtitle: `${dateShort(a.date)} · ${a.correction.in ?? "—"} → ${a.correction.out ?? "—"}`, issues: [] };
  });
  items.sort((x, y) => x.createdAt.localeCompare(y.createdAt) || x.key.localeCompare(y.key));
  return items.map((it) => ({ ...it, safe: !it.issues.some((i) => i.tone === "warning" || i.tone === "danger") }));
}
