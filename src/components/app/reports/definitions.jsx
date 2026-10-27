import { BarChart3, Building2, CalendarClock, Clock, Users, Wallet } from "lucide-react";
import { TODAY } from "@/lib/clock";
import { addDays } from "@/lib/dates";
import { date, money, periodLabel } from "@/lib/format";
import { attendanceStats, isActive, payrollSeries, riskyContracts, tenureOf, CONTRACT_RISK } from "@/components/app/_kit/metrics";

export const REPORTS = [
  { id: "effectif", title: "Effectif", description: "Liste du personnel actif par service, site et type de contrat.", icon: Users },
  { id: "masse-salariale", title: "Masse salariale", description: "Brut, net et coût employeur de chaque paie.", icon: Wallet },
  { id: "absenteisme", title: "Absentéisme", description: "Absences, arrêts maladie, retards et heures supplémentaires par service.", icon: Clock },
  { id: "cout-site", title: "Coût par site", description: "Coût employeur de la dernière paie, par établissement.", icon: Building2 },
  { id: "contrats", title: "Contrats à échéance", description: "Contrats expirés ou arrivant à terme sous 60 jours, fins de période d'essai.", icon: CalendarClock },
  { id: "anciennete", title: "Ancienneté", description: "Répartition du personnel par tranche d'ancienneté et par service.", icon: BarChart3 },
];

const dept = (d, id) => d.departments.find((x) => x.id === id)?.name ?? "—";
const site = (d, id) => d.entities.find((x) => x.id === id)?.name ?? "—";
const lastRun = (d) => [...d.payrollRuns].sort((a, b) => a.period.localeCompare(b.period)).at(-1);

/** Returns { columns, rows, summary: [{label,value}], chart?: {kind, ...}, csv: [{key,header,value?}] } */
export function buildReport(id, d) {
  const active = d.employees.filter(isActive);

  if (id === "effectif") {
    const rows = active.map((e) => ({ id: e.id, matricule: e.matricule, name: `${e.firstName} ${e.lastName}`, dept: dept(d, e.departmentId), site: site(d, e.entityId), contract: e.contract.type, hireDate: e.hireDate, tenure: Math.round(tenureOf(e) * 10) / 10 }));
    const byDept = d.departments.map((x) => ({ label: x.name, value: active.filter((e) => e.departmentId === x.id).length })).sort((a, b) => b.value - a.value);
    return {
      rows,
      columns: [
        { key: "matricule", header: "Matricule" },
        { key: "name", header: "Nom" },
        { key: "dept", header: "Service" },
        { key: "site", header: "Site" },
        { key: "contract", header: "Contrat" },
        { key: "hireDate", header: "Embauche", cell: (r) => <span className="num">{date(r.hireDate)}</span> },
        { key: "tenure", header: "Ancienneté (ans)", align: "end" },
      ],
      summary: [{ label: "Effectif actif", value: String(rows.length) }, { label: "CDI", value: String(rows.filter((r) => r.contract === "CDI").length) }, { label: "Autres contrats", value: String(rows.filter((r) => r.contract !== "CDI").length) }],
      chart: { kind: "bars", title: "Effectif par service", items: byDept },
    };
  }

  if (id === "masse-salariale") {
    const series = payrollSeries(d.payrollRuns, 12);
    const rows = [...series].reverse().map((s) => {
      const run = d.payrollRuns.find((r) => r.period === s.period);
      return { id: s.period, period: s.period, headcount: s.headcount, gross: s.gross, net: s.net, cnasEmployer: run.totals.cnasEmployer, employerCost: s.employerCost };
    });
    const tot = rows.reduce((a, r) => a + r.employerCost, 0);
    return {
      rows,
      columns: [
        { key: "period", header: "Période", cell: (r) => <span className="capitalize">{periodLabel(r.period)}</span> },
        { key: "headcount", header: "Effectif", align: "end" },
        { key: "gross", header: "Brut", align: "end", cell: (r) => money(r.gross, { decimals: 0 }) },
        { key: "net", header: "Net payé", align: "end", cell: (r) => money(r.net, { decimals: 0 }) },
        { key: "cnasEmployer", header: "CNAS patronale", align: "end", cell: (r) => money(r.cnasEmployer, { decimals: 0 }) },
        { key: "employerCost", header: "Coût employeur", align: "end", cell: (r) => money(r.employerCost, { decimals: 0 }) },
      ],
      summary: [{ label: "Coût employeur cumulé", value: money(tot, { decimals: 0 }) }, { label: "Paies", value: String(rows.length) }, { label: "Coût moyen / paie", value: money(rows.length ? tot / rows.length : 0, { decimals: 0 }) }],
      chart: { kind: "area", series: [{ name: "Brut", key: "gross", color: "var(--chart-1)" }, { name: "Coût employeur", key: "employerCost", color: "var(--chart-4)" }], points: series },
    };
  }

  if (id === "absenteisme") {
    const from = addDays(TODAY, -20);
    const rows = d.departments.map((x) => {
      const ids = new Set(active.filter((e) => e.departmentId === x.id).map((e) => e.id));
      const s = attendanceStats(d, ids, from, TODAY);
      return { id: x.id, dept: x.name, headcount: ids.size, absentDays: s.absentDays, absentRate: s.absentRate, lateRate: s.lateRate, overtime: s.overtimeHours };
    }).filter((r) => r.headcount > 0);
    const all = attendanceStats(d, new Set(active.map((e) => e.id)), from, TODAY);
    return {
      rows,
      columns: [
        { key: "dept", header: "Service" },
        { key: "headcount", header: "Effectif", align: "end" },
        { key: "absentDays", header: "Jours d'absence", align: "end" },
        { key: "absentRate", header: "Absentéisme (%)", align: "end", cell: (r) => String(r.absentRate).replace(".", ",") },
        { key: "lateRate", header: "Retards (%)", align: "end", cell: (r) => String(r.lateRate).replace(".", ",") },
        { key: "overtime", header: "H. sup.", align: "end", cell: (r) => String(r.overtime).replace(".", ",") },
      ],
      summary: [{ label: "Absentéisme (21 j)", value: `${String(all.absentRate).replace(".", ",")} %` }, { label: "Jours d'absence", value: String(all.absentDays) }, { label: "Retards", value: `${String(all.lateRate).replace(".", ",")} %` }],
      chart: { kind: "bars", title: "Taux d'absentéisme par service (%)", items: rows.map((r) => ({ label: r.dept, value: r.absentRate })).sort((a, b) => b.value - a.value), format: (v) => `${String(v).replace(".", ",")} %` },
    };
  }

  if (id === "cout-site") {
    const run = lastRun(d);
    const rows = d.entities.map((en) => {
      const lines = run ? run.lines.filter((l) => d.employees.find((e) => e.id === l.employeeId)?.entityId === en.id) : [];
      const gross = lines.reduce((s, l) => s + l.gross, 0);
      const cost = lines.reduce((s, l) => s + l.employerCost, 0);
      return { id: en.id, site: en.name, headcount: lines.length, gross: Math.round(gross), cost: Math.round(cost), perHead: lines.length ? Math.round(cost / lines.length) : 0 };
    });
    const total = rows.reduce((s, r) => s + r.cost, 0);
    return {
      rows,
      columns: [
        { key: "site", header: "Site" },
        { key: "headcount", header: "Effectif payé", align: "end" },
        { key: "gross", header: "Brut", align: "end", cell: (r) => money(r.gross, { decimals: 0 }) },
        { key: "cost", header: "Coût employeur", align: "end", cell: (r) => money(r.cost, { decimals: 0 }) },
        { key: "perHead", header: "Par salarié", align: "end", cell: (r) => money(r.perHead, { decimals: 0 }) },
      ],
      summary: [{ label: run ? `Paie de ${periodLabel(run.period)}` : "Paie", value: money(total, { decimals: 0 }) }, { label: "Sites", value: String(rows.length) }],
      chart: { kind: "bars", title: "Coût employeur par site", items: rows.map((r) => ({ label: r.site, value: r.cost })).sort((a, b) => b.value - a.value), format: (v) => money(v, { decimals: 0 }) },
    };
  }

  if (id === "contrats") {
    const list = riskyContracts(d.employees, 60);
    const rows = list.map((r) => ({ id: `${r.employee.id}-${r.kind}`, name: `${r.employee.firstName} ${r.employee.lastName}`, dept: dept(d, r.employee.departmentId), type: r.employee.contract.type, kind: r.kind, date: r.date, days: r.days }));
    return {
      rows,
      columns: [
        { key: "name", header: "Salarié" },
        { key: "dept", header: "Service" },
        { key: "type", header: "Contrat" },
        { key: "kind", header: "Situation", cell: (r) => CONTRACT_RISK[r.kind].label },
        { key: "date", header: "Échéance", cell: (r) => <span className="num">{date(r.date)}</span> },
        { key: "days", header: "Jours restants", align: "end", cell: (r) => (r.days < 0 ? `Expiré (${-r.days} j)` : r.days) },
      ],
      summary: [{ label: "À traiter", value: String(rows.length) }, { label: "Expirés", value: String(rows.filter((r) => r.kind === "expired").length) }, { label: "Sous 30 jours", value: String(rows.filter((r) => r.kind === "ending30").length) }],
    };
  }

  // anciennete
  const buckets = [["< 1 an", 0, 1], ["1 à 3 ans", 1, 3], ["3 à 5 ans", 3, 5], ["5 à 10 ans", 5, 10], ["10 ans et +", 10, Infinity]];
  const rows = d.departments.map((x) => {
    const list = active.filter((e) => e.departmentId === x.id);
    const row = { id: x.id, dept: x.name, total: list.length };
    buckets.forEach(([l, a, b], i) => { row[`b${i}`] = list.filter((e) => tenureOf(e) >= a && tenureOf(e) < b).length; });
    row.avg = list.length ? Math.round((list.reduce((s, e) => s + tenureOf(e), 0) / list.length) * 10) / 10 : 0;
    return row;
  }).filter((r) => r.total);
  return {
    rows,
    columns: [
      { key: "dept", header: "Service" },
      ...buckets.map(([l], i) => ({ key: `b${i}`, header: l, align: "end" })),
      { key: "avg", header: "Moyenne (ans)", align: "end", cell: (r) => String(r.avg).replace(".", ",") },
    ],
    summary: [{ label: "Ancienneté moyenne", value: `${String(Math.round((active.reduce((s, e) => s + tenureOf(e), 0) / Math.max(1, active.length)) * 10) / 10).replace(".", ",")} ans` }, { label: "Plus de 10 ans", value: String(active.filter((e) => tenureOf(e) >= 10).length) }],
    chart: { kind: "bars", title: "Personnel par tranche d'ancienneté", items: buckets.map(([label, a, b]) => ({ label, value: active.filter((e) => tenureOf(e) >= a && tenureOf(e) < b).length })) },
  };
}
