"use client";

import { useMemo } from "react";
import { CalendarClock, FileClock, FileWarning, Hourglass, Inbox, MessageSquarePlus, Wallet } from "lucide-react";
import { CURRENT_PERIOD, TODAY } from "@/lib/clock";
import { addDays, diffDays, isWeekend, holidayOn, listDays } from "@/lib/dates";
import { useCollection, useDb } from "@/lib/db";
import { fullName } from "@/lib/format";
import { attendanceStats, belowSnmg, forecastPayroll, isActive, payrollSeries, riskyContracts } from "@/components/app/_kit/metrics";
import { completeness } from "@/components/app/employees/helpers";

const VARIABLES_DEADLINE = "2026-11-05";
export const PRIORITY = [
  { label: "Urgent", tone: "danger" },
  { label: "Cette semaine", tone: "warning" },
  { label: "À planifier", tone: "neutral" },
];
const MONTH_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export const monthShort = (period) => MONTH_SHORT[Number(period.slice(5, 7)) - 1];
const pctDelta = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);

function nextOccurrence(iso) {
  const md = iso.slice(5);
  const y = Number(TODAY.slice(0, 4));
  const d = `${y}-${md}`;
  return d >= TODAY ? d : `${y + 1}-${md}`;
}

export function pluralFr(n, one, many) {
  return n > 1 ? many ?? `${one}s` : one;
}

/** Everything the role dashboards need, derived once from the db. */
export function useDashboardData() {
  const employees = useCollection("employees");
  const departments = useCollection("departments");
  const leaveRequests = useCollection("leaveRequests");
  const requests = useCollection("requests");
  const runs = useCollection("payrollRuns");
  const attendance = useCollection("attendance");
  const declarations = useCollection("declarations");
  const params = useDb((s) => s.settings.payroll);

  return useMemo(() => {
    const active = employees.filter(isActive);
    const ids = new Set(active.map((e) => e.id));
    const series = payrollSeries(runs, 6);
    const forecast = forecastPayroll(employees, params);
    const last = series[series.length - 1];

    // headcount / payroll series (6 closed months + current)
    const labels = [...series.map((s) => monthShort(s.period)), `${monthShort(CURRENT_PERIOD)}*`].slice(-6);
    const trend = {
      labels,
      headcount: [...series.map((s) => s.headcount), active.length].slice(-6),
      gross: [...series.map((s) => s.gross), forecast.gross].slice(-6),
      net: [...series.map((s) => s.net), forecast.net].slice(-6),
      employerCost: [...series.map((s) => s.employerCost), forecast.employerCost].slice(-6),
    };

    // absenteeism: last 7 days vs previous 7, daily spark
    const stats7 = attendanceStats({ attendance, leaveRequests }, ids, addDays(TODAY, -6), TODAY);
    const statsPrev = attendanceStats({ attendance, leaveRequests }, ids, addDays(TODAY, -13), addDays(TODAY, -7));
    const dailyAbs = listDays(addDays(TODAY, -13), TODAY)
      .filter((d) => !isWeekend(d) && !holidayOn(d))
      .map((d) => attendanceStats({ attendance, leaveRequests }, ids, d, d).absentRate);

    // pending leaves
    const pendingLeaves = leaveRequests.filter((l) => l.status === "pending");
    const weekly = Array.from({ length: 6 }, (_, i) => {
      const to = addDays(TODAY, -7 * (5 - i));
      const from = addDays(to, -6);
      return leaveRequests.filter((l) => l.createdAt >= from && l.createdAt <= to).length;
    });
    const pendingRequests = requests.filter((r) => r.status === "pending");

    // cost by department (gross, forecast month)
    const byDept = departments
      .map((d) => {
        const list = active.filter((e) => e.departmentId === d.id);
        return { id: d.id, label: d.name, count: list.length, value: forecastPayroll(list, params).gross };
      })
      .filter((d) => d.count)
      .sort((a, b) => b.value - a.value);

    // payroll tracker
    const run = runs.find((r) => r.period === CURRENT_PERIOD);
    const doneMap = { draft: 1, computed: 2, validated: 3, paid: 4, declared: 5, closed: 5, error: 1 };
    const decl = declarations.find((d) => d.kind === "G50" && d.period === CURRENT_PERIOD);
    const doneSteps = run ? doneMap[run.status] ?? 0 : 0;
    const steps = [
      { key: "vars", label: "Variables", date: VARIABLES_DEADLINE },
      { key: "calc", label: "Calcul", date: addDays(VARIABLES_DEADLINE, 3) },
      { key: "valid", label: "Validation", date: addDays(VARIABLES_DEADLINE, 4) },
      { key: "pay", label: "Paiement", date: addDays(VARIABLES_DEADLINE, 5) },
      { key: "decl", label: "Déclarations", date: decl?.dueDate ?? "2026-11-20" },
    ];

    // incomplete files and contracts
    const incomplete = active.filter((e) => completeness(e).critical.length);
    const missingCnas = active.filter((e) => !String(e.cnasNumber ?? "").trim());
    const ending = riskyContracts(employees, 30).filter((r) => r.kind === "expired" || r.kind === "ending30");
    const endingContracts = [...new Map(ending.map((r) => [r.employee.id, r])).values()];
    const underSnmg = belowSnmg(employees, params);

    // tasks
    const tasks = [];
    if (pendingLeaves.length) {
      const soon = pendingLeaves.some((l) => l.from <= addDays(TODAY, 7));
      tasks.push({ id: "leave", icon: Inbox, priority: soon ? 0 : 1, title: `Approuver ${pendingLeaves.length} ${pluralFr(pendingLeaves.length, "demande")} de congé`, detail: soon ? "Au moins une absence commence cette semaine." : "Les salariés attendent une réponse.", href: "/app/inbox", cta: "Examiner" });
    }
    if (underSnmg.length) {
      tasks.push({ id: "snmg", icon: FileWarning, priority: 0, title: `${underSnmg.length} ${pluralFr(underSnmg.length, "salaire")} sous le SNMG`, detail: `${fullName(underSnmg[0])}${underSnmg.length > 1 ? ` et ${underSnmg.length - 1} autre(s)` : ""} : minimum légal ${params.snmg.toLocaleString("fr-FR")} DA.`, href: `/app/employees/${underSnmg[0].id}?tab=pay`, cta: "Corriger" });
    }
    if (incomplete.length) {
      tasks.push({ id: "cnas", icon: FileClock, priority: 1, title: missingCnas.length ? `Renseigner le N° CNAS de ${missingCnas.length} ${pluralFr(missingCnas.length, "salarié")}` : `Compléter ${incomplete.length} ${pluralFr(incomplete.length, "dossier")}`, detail: `${incomplete.length} dossier${incomplete.length > 1 ? "s" : ""} avec pièce obligatoire manquante (N° CNAS, NIN ou RIB).`, href: "/app/employees?filter=incomplete", cta: "Compléter" });
    }
    if (endingContracts.length) {
      const expired = endingContracts.filter((r) => r.kind === "expired").length;
      tasks.push({ id: "contracts", icon: Hourglass, priority: 1, title: `${endingContracts.length} ${pluralFr(endingContracts.length, "contrat")} à renouveler`, detail: `Échéance sous 30 jours${expired ? ` dont ${expired} déjà échu${expired > 1 ? "s" : ""}` : ""}.`, href: "/app/employees?filter=ending", cta: "Voir" });
    }
    if (pendingRequests.length) {
      tasks.push({ id: "requests", icon: MessageSquarePlus, priority: 1, title: `Traiter ${pendingRequests.length} ${pluralFr(pendingRequests.length, "demande")} salarié`, detail: "Attestations, changements d'informations, avances.", href: "/app/requests", cta: "Ouvrir" });
    }
    if (!run) {
      const d = diffDays(TODAY, VARIABLES_DEADLINE);
      tasks.push({ id: "payroll", icon: Wallet, priority: d <= 7 ? 1 : 2, title: "Préparer la paie d'octobre", detail: `Variables à saisir avant le 05/11 (dans ${d} jours).`, href: "/app/payroll", cta: "Préparer" });
    }
    const dueDecl = declarations.filter((d) => d.status === "todo" && diffDays(TODAY, d.dueDate) <= 30 && diffDays(TODAY, d.dueDate) >= 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    if (dueDecl.length) {
      const d = diffDays(TODAY, dueDecl[0].dueDate);
      tasks.push({ id: "decl", icon: CalendarClock, priority: d <= 14 ? 1 : 2, title: `Déposer ${[...new Set(dueDecl.map((x) => x.kind))].join(" et ")} d'octobre`, detail: `Échéance le ${dueDecl[0].dueDate.split("-").reverse().join("/")} (dans ${d} jours).`, href: "/app/payroll/declarations", cta: "Préparer" });
    }
    tasks.sort((a, b) => a.priority - b.priority);

    // upcoming events
    const events = [];
    for (const e of active) {
      const bd = nextOccurrence(e.birthDate);
      if (bd <= addDays(TODAY, 30)) events.push({ id: `b-${e.id}`, kind: "birthday", date: bd, employee: e, label: "Anniversaire" });
      const an = nextOccurrence(e.hireDate);
      const years = Number(an.slice(0, 4)) - Number(e.hireDate.slice(0, 4));
      if (an <= addDays(TODAY, 30) && years >= 1) events.push({ id: `a-${e.id}`, kind: "anniversary", date: an, employee: e, label: `${years} an${years > 1 ? "s" : ""} d'ancienneté` });
      const t = e.contract?.trialEnd;
      if (t && t >= TODAY && t <= addDays(TODAY, 60)) events.push({ id: `t-${e.id}`, kind: "trial", date: t, employee: e, label: "Fin de période d'essai" });
      const c = e.contract?.endDate;
      if (c && c >= TODAY && c <= addDays(TODAY, 45)) events.push({ id: `c-${e.id}`, kind: "contract", date: c, employee: e, label: `Fin de ${e.contract.type}` });
    }
    events.sort((a, b) => a.date.localeCompare(b.date));

    return {
      employees, departments, leaveRequests, requests, runs, attendance, declarations, params, active, trend, forecast, last, run, steps, doneSteps,
      kpi: {
        headcount: { value: active.length, delta: pctDelta(active.length, last?.headcount), spark: trend.headcount },
        gross: { value: forecast.gross, delta: pctDelta(forecast.gross, last?.gross), spark: trend.gross },
        absence: { value: stats7.absentRate, delta: statsPrev.absentRate ? Math.round((stats7.absentRate - statsPrev.absentRate) * 10) / 10 : null, spark: dailyAbs.length > 1 ? dailyAbs : [0, 0], days: stats7.absentDays },
        leave: { value: pendingLeaves.length, spark: weekly },
      },
      pendingLeaves, pendingRequests, byDept, tasks, events, underSnmg, incomplete, endingContracts,
    };
  }, [employees, departments, leaveRequests, requests, runs, attendance, declarations, params]);
}

