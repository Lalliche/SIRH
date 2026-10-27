"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, Clock, Download, FileWarning, FolderX, Users, Wallet, Banknote, ClipboardList } from "lucide-react";
import { AreaChart, BarList, Button, Card, Donut, KpiCard, PageHeader, Segmented } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { downloadCsv } from "@/components/app/_kit/csv";
import { AGE_BUCKETS, CONTRACT_RISK, TENURE_BUCKETS, ageOf, attendanceStats, belowSnmg, bucketize, forecastPayroll, headcountAt, incompleteFiles, isActive, monthEnds, payrollProgress, payrollSeries, riskyContracts, tenureOf, turnoverRate, weeklyBuckets } from "@/components/app/_kit/metrics";
import { TODAY } from "@/lib/clock";
import { addDays } from "@/lib/dates";
import { fullName, int, money, periodLabel } from "@/lib/format";
import AlertsPanel from "./AlertsPanel";
import ChartCard from "./ChartCard";
import { REPORTS } from "./definitions";
import { compact, shortMonth, useHrData } from "./data";

const STEP_LABEL = ["Non lancée", "Variables saisies", "Paie calculée", "Paie validée", "Paie versée", "Déclarations déposées"];
const pctText = (n) => `${String(n).replace(".", ",")} %`;
const deltaPct = (a, b) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null);

function Content() {
  const d = useHrData();
  const [months, setMonths] = useState("6");
  const active = useMemo(() => d.employees.filter(isActive), [d.employees]);

  const m = useMemo(() => {
    const series = payrollSeries(d.payrollRuns, 12);
    const last = series.at(-1);
    const prev = series.at(-2);
    const progress = payrollProgress(d.payrollRuns);
    const forecast = forecastPayroll(d.employees, d.params);
    const ids = new Set(active.map((e) => e.id));
    const full = attendanceStats(d, ids, addDays(TODAY, -20), TODAY);
    const weekly = weeklyBuckets().map((w) => attendanceStats(d, ids, w.from, w.to));
    const risk = riskyContracts(d.employees);
    const incomplete = incompleteFiles(d.employees);
    const trend = monthEnds(6).map((x) => headcountAt(d.employees, x.end));
    return { series, last, prev, progress, forecast, full, weekly, risk, incomplete, trend, turnover: turnoverRate(d.employees) };
  }, [d, active]);

  const n = Number(months);
  const chartSeries = m.series.slice(-n);
  const riskCount = m.risk.filter((r) => r.kind !== "trial").length;
  const expired = m.risk.filter((r) => r.kind === "expired").length;
  const hiredThisMonth = active.filter((e) => e.hireDate.startsWith(TODAY.slice(0, 7))).length;

  const byDept = useMemo(() => {
    const rows = d.departments.map((x) => ({ label: x.name, value: active.filter((e) => e.departmentId === x.id).length })).filter((r) => r.value).sort((a, b) => b.value - a.value);
    const top = rows.slice(0, 4);
    const rest = rows.slice(4).reduce((s, r) => s + r.value, 0);
    return { rows, donut: rest ? [...top, { label: "Autres services", value: rest }] : top };
  }, [d.departments, active]);
  const tenure = bucketize(active.map(tenureOf), TENURE_BUCKETS);
  const ages = bucketize(active.map(ageOf), AGE_BUCKETS);

  const alertItems = useMemo(() => {
    const ppl = (list, note) => list.map((r) => ({ id: r.employee.id, name: fullName(r.employee), note: note?.(r) }));
    const docsSoon = d.documents.filter((x) => x.expiresAt && x.expiresAt <= addDays(TODAY, 60));
    const missing = (label) => incompleteFiles(d.employees).filter((x) => x.missing.includes(label));
    return [
      { id: "expired", label: "Contrats expirés", tone: "danger", href: "/app/employees", people: ppl(m.risk.filter((r) => r.kind === "expired"), (r) => `depuis ${-r.days} j`) },
      { id: "e30", label: "Contrats à échéance sous 30 jours", tone: "warning", href: "/app/employees", people: ppl(m.risk.filter((r) => r.kind === "ending30"), (r) => `dans ${r.days} j`) },
      { id: "e60", label: "Contrats à échéance sous 60 jours", tone: "info", href: "/app/employees", people: ppl(m.risk.filter((r) => r.kind === "ending50"), (r) => `dans ${r.days} j`) },
      { id: "cnas", label: "N° CNAS manquant", tone: "danger", href: "/app/employees", people: ppl(missing("N° CNAS")) },
      { id: "nin", label: "NIN manquant", tone: "warning", href: "/app/employees", people: ppl(missing("NIN")) },
      { id: "rib", label: "RIB manquant", tone: "warning", href: "/app/employees", people: ppl(missing("RIB")) },
      { id: "snmg", label: `Salaire de base inférieur au SNMG (${money(d.params.snmg, { decimals: 0 })})`, tone: "danger", href: "/app/employees", people: belowSnmg(d.employees, d.params).map((e) => ({ id: e.id, name: fullName(e), note: money(e.baseSalary, { decimals: 0 }) })) },
      { id: "docs", label: "Documents qui expirent sous 60 jours", tone: "warning", href: "/app/documents", people: docsSoon.map((x) => ({ id: x.ownerId, name: x.name, note: x.expiresAt })) },
    ];
  }, [d, m.risk]);
  const alertTotal = alertItems.reduce((s, a) => s + a.people.length, 0);

  const exportKpis = () => downloadCsv("statistiques-rh.csv", [
    { k: "Effectif actif", v: active.length, n: `${hiredThisMonth} embauche(s) ce mois` },
    { k: "Avancement paie (%)", v: m.progress.value, n: STEP_LABEL[m.progress.done] },
    { k: "Coût employeur réel (DA)", v: m.last?.employerCost ?? "", n: m.last ? periodLabel(m.last.period) : "" },
    { k: "Masse salariale prévisionnelle (DA)", v: m.forecast.gross, n: "Octobre 2026" },
    { k: "Absentéisme (%)", v: m.full.absentRate, n: "21 derniers jours" },
    { k: "Heures supplémentaires", v: m.full.overtimeHours, n: "21 derniers jours" },
    { k: "Contrats à risque", v: riskCount, n: `${expired} expiré(s)` },
    { k: "Dossiers incomplets", v: m.incomplete.length, n: "" },
  ], [{ key: "k", header: "Indicateur" }, { key: "v", header: "Valeur" }, { key: "n", header: "Remarque" }]);

  const exportPayroll = () => downloadCsv("paie-cout-employeur.csv", chartSeries, [
    { key: "period", header: "Période" }, { key: "headcount", header: "Effectif" }, { key: "gross", header: "Brut (DA)" }, { key: "net", header: "Net (DA)" }, { key: "employerCost", header: "Coût employeur (DA)" },
  ]);
  const exportItems = (name, items) => downloadCsv(name, items, [{ key: "label", header: "Libellé" }, { key: "value", header: "Valeur" }]);

  return (
    <>
      <PageHeader
        title="Statistiques RH"
        description="Effectif, paie, présence et conformité en un coup d'œil. Chaque chiffre vient de vos données, pas d'un export manuel."
        actions={
          <>
            <Segmented value={months} onChange={setMonths} options={[{ value: "3", label: "3 mois" }, { value: "6", label: "6 mois" }]} />
            <Button variant="secondary" icon={Download} onClick={exportKpis}>Exporter</Button>
          </>
        }
      />

      <section aria-label="Indicateurs clés" className="mb-[1.5em] grid grid-cols-2 gap-[1em] lg:grid-cols-4">
        <KpiCard label="Effectif actif" value={int(active.length)} icon={Users} spark={m.trend} hint={hiredThisMonth ? `${hiredThisMonth} embauche ce mois` : "stable ce mois"} />
        <KpiCard label="Avancement paie" value={`${m.progress.value} %`} icon={ClipboardList} hint={STEP_LABEL[m.progress.done]} accent />
        <KpiCard label="Coût employeur réel" value={m.last ? compactMoney(m.last.employerCost) : "—"} icon={Banknote} delta={m.last && m.prev ? deltaPct(m.last.employerCost, m.prev.employerCost) : undefined} deltaGoodWhen="down" hint={m.last ? periodLabel(m.last.period) : undefined} spark={m.series.slice(-6).map((s) => s.employerCost)} />
        <KpiCard label="Masse salariale prév." value={compactMoney(m.forecast.gross)} icon={Wallet} delta={m.last ? deltaPct(m.forecast.gross, m.last.gross) : undefined} deltaGoodWhen="down" hint="brut, octobre" />
        <KpiCard label="Absentéisme" value={pctText(m.full.absentRate)} icon={Activity} hint="21 derniers jours" />
        <KpiCard label="Heures sup." value={`${String(m.full.overtimeHours).replace(".", ",")} h`} icon={Clock} hint={`${String(m.full.overtimePerPerson).replace(".", ",")} h / personne`} />
        <KpiCard label="Contrats à risque" value={riskCount} icon={FileWarning} hint={expired ? `dont ${expired} expiré${expired > 1 ? "s" : ""}` : "échéance sous 60 j"} />
        <KpiCard label="Dossiers incomplets" value={m.incomplete.length} icon={FolderX} hint={m.incomplete.length ? "pièces manquantes" : "tout est à jour"} />
      </section>

      <div className="mb-[1em] grid gap-[1em] xl:grid-cols-[1.7fr_1fr]">
        <ChartCard title="Paie et coût employeur" description={`${n} derniers mois · en dinars`} onExport={exportPayroll}>
          {chartSeries.length > 1 ? (
            <>
              <div role="img" aria-label={`Évolution du brut et du coût employeur sur ${chartSeries.length} mois. Dernier mois : brut ${money(chartSeries.at(-1).gross, { decimals: 0 })}, coût employeur ${money(chartSeries.at(-1).employerCost, { decimals: 0 })}.`}>
                <AreaChart
                  labels={chartSeries.map((s) => shortMonth(s.period))}
                  format={compact}
                  series={[
                    { name: "Brut", color: "var(--chart-1)", data: chartSeries.map((s) => s.gross) },
                    { name: "Coût employeur", color: "var(--chart-4)", data: chartSeries.map((s) => s.employerCost) },
                  ]}
                />
              </div>
              <ul className="mt-[0.5em] flex flex-wrap gap-x-[1.5em] gap-y-[0.3em] text-xs text-fg-secondary">
                <li className="flex items-center gap-[0.5em]"><span aria-hidden className="h-[0.25em] w-[1.4em] rounded-full bg-chart-1" />Masse salariale brute</li>
                <li className="flex items-center gap-[0.5em]"><span aria-hidden className="h-[0.25em] w-[1.4em] rounded-full bg-chart-4" />Coût employeur (brut + cotisations patronales)</li>
              </ul>
            </>
          ) : (
            <p className="py-[2em] text-center text-sm text-fg-muted">Pas assez de paies clôturées pour tracer une courbe.</p>
          )}
        </ChartCard>

        <Card>
          <div className="mb-[0.8em] flex items-start justify-between gap-[1em]">
            <div>
              <h2 className="text-h3 font-semibold text-fg">Alertes et conformité</h2>
              <p className="mt-[0.15em] text-sm text-fg-muted">{alertTotal ? `${alertTotal} point${alertTotal > 1 ? "s" : ""} à traiter` : "Aucune alerte"}</p>
            </div>
            <AlertTriangle className="size-[1.2em] text-fg-faint" aria-hidden />
          </div>
          <AlertsPanel items={alertItems} />
        </Card>
      </div>

      <div className="mb-[1em] grid gap-[1em] lg:grid-cols-2">
        <ChartCard title="Répartition par service" description={`${active.length} salariés actifs`} onExport={() => exportItems("effectif-par-service.csv", byDept.rows)}>
          <Donut items={byDept.donut} center={<><span className="font-display text-h2 font-semibold text-fg num">{active.length}</span><span className="text-xs text-fg-muted">actifs</span></>} />
          <div className="mt-[1.25em] border-t border-border-subtle pt-[1em]"><BarList items={byDept.rows} /></div>
        </ChartCard>
        <div className="grid gap-[1em]">
          <ChartCard title="Ancienneté" onExport={() => exportItems("anciennete.csv", tenure)}><BarList items={tenure} format={(v) => `${v}`} /></ChartCard>
          <ChartCard title="Âge" onExport={() => exportItems("age.csv", ages)}><BarList items={ages} format={(v) => `${v}`} /></ChartCard>
        </div>
      </div>

      <div className="mb-[1.5em] grid gap-[1em] md:grid-cols-3">
        <Card><p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Turnover (12 mois)</p><p className="mt-[0.4em] font-display text-kpi font-semibold text-fg num">{pctText(m.turnover.rate)}</p><p className="mt-[0.3em] text-sm text-fg-secondary">{m.turnover.exits} départ{m.turnover.exits > 1 ? "s" : ""} sur l&apos;effectif moyen</p></Card>
        <Card><p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Âge moyen</p><p className="mt-[0.4em] font-display text-kpi font-semibold text-fg num">{String(Math.round((active.reduce((s, e) => s + ageOf(e), 0) / Math.max(1, active.length)) * 10) / 10).replace(".", ",")} ans</p><p className="mt-[0.3em] text-sm text-fg-secondary">Ancienneté moyenne : {String(Math.round((active.reduce((s, e) => s + tenureOf(e), 0) / Math.max(1, active.length)) * 10) / 10).replace(".", ",")} ans</p></Card>
        <Card><p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Femmes / hommes</p><p className="mt-[0.4em] font-display text-kpi font-semibold text-fg num">{active.filter((e) => e.gender === "F").length} / {active.filter((e) => e.gender === "M").length}</p><p className="mt-[0.3em] text-sm text-fg-secondary">{Math.round((active.filter((e) => e.gender === "F").length / Math.max(1, active.length)) * 100)} % de femmes</p></Card>
      </div>

      <section aria-labelledby="lib">
        <h2 id="lib" className="mb-[0.8em] text-h3 font-semibold text-fg">Bibliothèque de rapports</h2>
        <ul className="grid gap-[0.8em] md:grid-cols-2 xl:grid-cols-3">
          {REPORTS.map((r) => (
            <li key={r.id}>
              <Link href={`/app/reports/${r.id}`} className="group flex h-full items-start gap-[0.9em] rounded-lg border border-border bg-surface p-[1.1em] shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-border-strong hover:shadow-md">
                <span className="flex size-[2.6em] shrink-0 items-center justify-center rounded-md bg-primary-soft text-link"><r.icon className="size-[1.3em]" aria-hidden strokeWidth={1.5} /></span>
                <span className="min-w-0 flex-1"><span className="block font-semibold text-fg">{r.title}</span><span className="mt-[0.2em] block text-sm text-fg-secondary">{r.description}</span></span>
                <ArrowRight className="mt-[0.3em] size-[1.1em] text-fg-faint transition-transform duration-150 group-hover:translate-x-[0.2em]" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

const compactMoney = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2).replace(".", ",")} M DA` : money(n, { decimals: 0 }));

export default function ReportsView() {
  return <AccessGate roles={["admin", "hr", "accountant"]}>{() => <Content />}</AccessGate>;
}
