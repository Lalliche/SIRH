import { TODAY } from "@/lib/clock";
import { addDays, diffDays } from "@/lib/dates";
import { MISSING_FIELDS, isActive, teamOf } from "@/components/app/_kit/metrics";

export const EMP_STATUS = {
  actif: { label: "Actif", tone: "success" },
  essai: { label: "Période d'essai", tone: "info" },
  conge: { label: "En congé", tone: "brand" },
  sorti: { label: "Sorti", tone: "neutral" },
};

export const EXIT_REASONS = ["Démission", "Fin de CDD", "Licenciement", "Retraite", "Fin de période d'essai", "Abandon de poste", "Rupture conventionnelle"];
export const CDD_REASONS = ["Remplacement d'un salarié absent", "Surcroît temporaire d'activité", "Travail saisonnier", "Projet à durée définie", "Accord de la CNAS / ANEM"];

export const SENSITIVE_ROLES = ["admin", "hr", "accountant"]; // may reveal salary / IDs
export const EDIT_ROLES = ["admin", "hr"];
export const canEdit = (role) => EDIT_ROLES.includes(role);

const CRITICAL = ["cnasNumber", "nin", "rib"];

/** Missing-file analysis: 5 tracked fields (N° CNAS, NIN, RIB, téléphone, adresse); first three are critical. */
export function completeness(e) {
  const missing = MISSING_FIELDS.filter(([k]) => !String(e[k] ?? "").trim()).map(([key, label]) => ({ key, label, critical: CRITICAL.includes(key) }));
  const pct = Math.round(((MISSING_FIELDS.length - missing.length) / MISSING_FIELDS.length) * 100);
  return { pct, missing, critical: missing.filter((m) => m.critical) };
}

/** Which employees a role can see in lists. Managers: their team; employees: nobody else. */
export function scopeEmployees(role, me, employees, departments) {
  if (role === "employee") return employees.filter((e) => e.id === me?.id);
  if (role === "manager" && me) return teamOf(employees, departments, me.id);
  return employees;
}

export function canOpenProfile(role, me, target, employees, departments) {
  if (!target) return false;
  if (SENSITIVE_ROLES.includes(role)) return true;
  if (target.id === me?.id) return true;
  if (role === "manager" && me) return teamOf(employees, departments, me.id).some((e) => e.id === target.id);
  return false;
}

export const canSeeSalary = (role, me, target) => SENSITIVE_ROLES.includes(role) || (!!target && target.id === me?.id);

export const endsWithin = (e, days = 30) => isActive(e) && !!e.contract?.endDate && e.contract.endDate <= addDays(TODAY, days);

/** "3 ans 4 mois" */
export function seniority(hireDate) {
  const days = diffDays(hireDate, TODAY);
  if (days < 0) return "Prend ses fonctions le " + hireDate.split("-").reverse().join("/");
  const months = Math.floor(days / 30.4375);
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0 && m === 0) return `${days} jour${days > 1 ? "s" : ""}`;
  return [y ? `${y} an${y > 1 ? "s" : ""}` : null, m ? `${m} mois` : null].filter(Boolean).join(" ");
}

export const maskRib = (rib) => (rib ? `•••• •••• •••• ${rib.slice(-4)}` : "—");
export const maskId = (v, keep = 4) => (v ? `${"•".repeat(Math.max(0, v.length - keep))}${v.slice(-keep)}` : "—");

export const frPhone = (v) => /^0[567]\d( ?\d{2}){3}$/.test(String(v).trim());
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());
export const onlyDigits = (v, max) => String(v ?? "").replace(/\D/g, "").slice(0, max);

export function nextMatricule(employees) {
  const max = employees.reduce((m, e) => Math.max(m, Number(String(e.matricule).replace(/\D/g, "")) || 0), 0);
  return `TI-${String(max + 1).padStart(4, "0")}`;
}
export function nextEmployeeId(employees) {
  const max = employees.reduce((m, e) => Math.max(m, Number(String(e.id).replace(/\D/g, "")) || 0), 0);
  return `emp-${String(Math.max(max, 99) + 1).padStart(3, "0")}`;
}
