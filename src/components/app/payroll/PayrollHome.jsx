"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calculator, CalendarClock, FileCheck2, ShieldAlert, Users } from "lucide-react";
import { AreaChart, Badge, Button, Card, CardHeader, DataTable, Delta, EmptyState, KpiCard, PageHeader, Progress, Segmented, StatusBadge } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { PAYROLL_STATUS } from "@/data/constants";
import { CURRENT_PERIOD, TODAY } from "@/lib/clock";
import { diffDays } from "@/lib/dates";
import { amount, date, dateLong, int, money } from "@/lib/format";
import { defaultPayDate, preflightSummary, totalsOf } from "@/lib/payroll-run";
import { draftId, WIZARD_STEPS } from "./drafts";
import { useDrafts, usePayrollModel, usePayrollRuns } from "./hooks";
import { compact, deMois, pctDelta, periodShort, periodTitle } from "./utils";

const NEUTRAL_DELTA = "!bg-neutral-bg !text-neutral-fg";

function trendHint(cur, prev, label) {
  const d = pctDelta(cur, prev);
  return d == null ? null : (
    <span className="inline-flex items-center gap-[0.5em]">
      <Delta value={d} className={NEUTRAL_DELTA} />
      <span>vs {label}</span>
    </span>
  );
}

function NextRunCard({ period, draft, run, model }) {
  const step = draft?.step ?? 0;
  const payDate = draft?.payDate ?? defaultPayDate(period);
  const days = diffDays(TODAY, payDate);
  const summary = preflightSummary(model.preflight.issues, draft?.acks);
  const state = run
    ? { label: PAYROLL_STATUS[run.status]?.label ?? run.status, tone: PAYROLL_STATUS[run.status]?.tone ?? "neutral" }
    : draft
      ? { label: `En préparation · étape ${step} sur 6`, tone: "info" }
      : { label: "À lancer", tone: "warning" };
  const cta = run ? { label: "Voir la paie", href: `/app/payroll/runs/${run.id}` } : draft ? { label: `Reprendre la paie ${deMois(period).replace(/ \d+$/, "")}`, href: "/app/payroll/runs/new" } : { label: `Lancer la paie ${deMois(period).replace(/ \d+$/, "")}`, href: "/app/payroll/runs/new" };
  return (
    <Card className="relative overflow-hidden border-t-2 border-t-primary">
      <div className="grid gap-[1.5em] lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-[0.7em]">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Prochaine paie</p>
            <Badge tone={state.tone}>{state.label}</Badge>
          </div>
          <h2 className="mt-[0.35em] font-display text-h2 font-semibold text-fg">{periodTitle(period)}</h2>
          <dl className="mt-[1em] grid gap-[0.9em] sm:grid-cols-3">
            <div>
              <dt className="flex items-center gap-[0.4em] text-xs text-fg-muted"><CalendarClock className="size-[1.1em]" aria-hidden />Échéance de paiement</dt>
              <dd className="mt-[0.2em] font-medium text-fg">{dateLong(payDate)}</dd>
              <dd className="text-xs text-fg-muted">{days >= 0 ? `dans ${days} jour${days > 1 ? "s" : ""}` : `${-days} j de retard`}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-[0.4em] text-xs text-fg-muted"><Users className="size-[1.1em]" aria-hidden />Effectif concerné</dt>
              <dd className="mt-[0.2em] font-medium text-fg num">{int(model.lines.length)} salariés</dd>
              <dd className="text-xs text-fg-muted">dont {model.diff.filter((d) => d.kind === "entree").length} entrée, {model.diff.filter((d) => d.kind === "sortie").length} sortie</dd>
            </div>
            <div>
              <dt className="flex items-center gap-[0.4em] text-xs text-fg-muted"><ShieldAlert className="size-[1.1em]" aria-hidden />Contrôles préalables</dt>
              <dd className="mt-[0.2em] font-medium text-fg">{summary.blockers ? `${summary.blockers} bloquant${summary.blockers > 1 ? "s" : ""}` : "Aucun bloquant"}</dd>
              <dd className="text-xs text-fg-muted">{summary.warnings} avertissement{summary.warnings > 1 ? "s" : ""}</dd>
            </div>
          </dl>
          <div className="mt-[1.5em] flex flex-wrap gap-[0.6em]">
            <Button size="lg" href={cta.href} iconEnd={ArrowRight}>{cta.label}</Button>
            <Button size="lg" variant="secondary" icon={Calculator} href="/app/payroll/simulator">Simulateur</Button>
          </div>
        </div>
        <ol aria-label="Étapes de la paie" className="flex flex-col gap-[0.55em] border-t border-border-subtle pt-[1.2em] lg:border-s lg:border-t-0 lg:ps-[1.5em] lg:pt-0">
          {WIZARD_STEPS.map((s) => {
            const done = run ? true : step > s.n;
            const current = !run && step === s.n;
            return (
              <li key={s.key} className="flex items-center gap-[0.7em] text-sm">
                <span aria-hidden className={`flex size-[1.55em] shrink-0 items-center justify-center rounded-full text-xs font-semibold num ${done ? "bg-primary text-primary-fg" : current ? "bg-primary-soft text-link ring-2 ring-primary" : "bg-bg-sunken text-fg-muted"}`}>{s.n}</span>
                <span className={current ? "font-medium text-fg" : done ? "text-fg-secondary" : "text-fg-muted"}>{s.long}</span>
                <span className="sr-only">{done ? "terminée" : current ? "en cours" : "à venir"}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}

function Body() {
  const runs = usePayrollRuns();
  const drafts = useDrafts();
  const draft = drafts.find((d) => d.id === draftId(CURRENT_PERIOD));
  const model = usePayrollModel({ period: CURRENT_PERIOD, scope: draft?.scope ?? null, edits: draft?.edits });
  const currentRun = runs.find((r) => r.period === CURRENT_PERIOD);
  const closed = useMemo(() => runs.filter((r) => r.period !== CURRENT_PERIOD), [runs]);
  const last = closed.at(-1);
  const prev = closed.at(-2);
  const [view, setView] = useState("courbe");

  const lastTotals = last ? { ...last.totals, fnpos: last.totals.fnpos ?? totalsOf(last.lines).fnpos } : null;
  const prevTotals = prev ? { ...prev.totals, fnpos: prev.totals.fnpos ?? totalsOf(prev.lines).fnpos } : null;
  const cnasOf = (t) => (t ? t.cnasEmployee + t.cnasEmployer + (t.fnpos ?? 0) : 0);
  const sparkOf = (pick) => closed.slice(-6).map(pick);

  const trend = useMemo(() => {
    const pts = closed.slice(-11).map((r) => ({ label: periodShort(r.period), employerCost: r.totals.employerCost, net: r.totals.net, forecast: false }));
    if (!currentRun) pts.push({ label: `${periodShort(CURRENT_PERIOD)}*`, employerCost: model.totals.employerCost, net: model.totals.net, forecast: true });
    else pts.push({ label: periodShort(CURRENT_PERIOD), employerCost: currentRun.totals.employerCost, net: currentRun.totals.net, forecast: false });
    return pts;
  }, [closed, currentRun, model.totals]);

  const rows = useMemo(() => {
    const list = [...runs].map((r) => ({ id: r.id, period: r.period, status: r.status, headcount: r.headcount, gross: r.totals.gross, net: r.totals.net, employerCost: r.totals.employerCost, at: r.validatedAt, href: `/app/payroll/runs/${r.id}` }));
    if (draft && !currentRun) list.push({ id: draft.id, period: CURRENT_PERIOD, status: "draft", headcount: model.lines.length, gross: model.totals.gross, net: model.totals.net, employerCost: model.totals.employerCost, at: null, href: "/app/payroll/runs/new", provisional: true });
    return list;
  }, [runs, draft, currentRun, model]);

  const columns = [
    { key: "period", header: "Période", sortValue: (r) => r.period, cell: (r) => <Link href={r.href} className="font-medium text-fg hover:underline">{periodTitle(r.period)}{r.provisional ? " *" : ""}</Link> },
    { key: "status", header: "Statut", sortValue: (r) => r.status, cell: (r) => <StatusBadge status={r.status} map={PAYROLL_STATUS} /> },
    { key: "headcount", header: "Effectif", align: "end", sortValue: (r) => r.headcount, cell: (r) => int(r.headcount) },
    { key: "gross", header: "Brut (DA)", align: "end", sortValue: (r) => r.gross, cell: (r) => amount(r.gross, { decimals: 0 }) },
    { key: "net", header: "Net à payer (DA)", align: "end", sortValue: (r) => r.net, cell: (r) => <span className="font-medium">{amount(r.net, { decimals: 0 })}</span> },
    { key: "employerCost", header: "Coût employeur (DA)", align: "end", sortValue: (r) => r.employerCost, cell: (r) => amount(r.employerCost, { decimals: 0 }) },
    { key: "at", header: "Validée le", sortValue: (r) => r.at ?? "", cell: (r) => (r.at ? date(r.at) : <span className="text-fg-muted">—</span>) },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Paie"
        title="Paie du mois"
        description="Un cycle en six étapes : variables, calcul, contrôles, validation, paiement, déclarations. Chaque écart est expliqué avant que vous ne validiez."
        actions={
          <>
            <Button variant="secondary" icon={FileCheck2} href="/app/payroll/declarations">Déclarations</Button>
            <Button variant="secondary" href="/app/payslips">Mes bulletins</Button>
          </>
        }
      />

      <div className="flex flex-col gap-[1.5em]">
        <NextRunCard period={CURRENT_PERIOD} draft={draft} run={currentRun} model={model} />

        {last ? (
          <section aria-label={`Indicateurs de la paie ${deMois(last.period)}`} className="grid grid-cols-1 gap-[1em] sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Masse brute" value={money(lastTotals.gross, { decimals: 0 })} hint={trendHint(lastTotals.gross, prevTotals?.gross, periodShort(prev?.period ?? last.period))} spark={sparkOf((r) => r.totals.gross)} />
            <KpiCard accent label="Net à payer" value={money(lastTotals.net, { decimals: 0 })} hint={trendHint(lastTotals.net, prevTotals?.net, periodShort(prev?.period ?? last.period))} spark={sparkOf((r) => r.totals.net)} />
            <KpiCard label="Coût employeur" value={money(lastTotals.employerCost, { decimals: 0 })} hint={trendHint(lastTotals.employerCost, prevTotals?.employerCost, periodShort(prev?.period ?? last.period))} spark={sparkOf((r) => r.totals.employerCost)} />
            <KpiCard label="Charges CNAS" value={money(cnasOf(lastTotals), { decimals: 0 })} hint={trendHint(cnasOf(lastTotals), cnasOf(prevTotals), periodShort(prev?.period ?? last.period))} spark={sparkOf((r) => r.totals.cnasEmployee + r.totals.cnasEmployer)} />
          </section>
        ) : null}
        {last && <p className="-mt-[0.8em] text-xs text-fg-muted">Indicateurs de la dernière paie close, {periodTitle(last.period).toLowerCase()}. Charges CNAS = part salarié + part employeur + FNPOS.</p>}

        <div className="grid gap-[1.5em] xl:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader
              title="Coût de la paie"
              description={`${trend.length} derniers mois · l'astérisque marque le mois en préparation`}
              action={<Segmented size="sm" value={view} onChange={setView} options={[{ value: "courbe", label: "Courbe" }, { value: "valeurs", label: "Valeurs" }]} />}
            />
            {view === "courbe" ? (
              <>
                <AreaChart
                  labels={trend.map((t) => t.label)}
                  series={[{ name: "Coût employeur", color: "var(--chart-1)", data: trend.map((t) => t.employerCost) }, { name: "Net à payer", color: "var(--chart-4)", data: trend.map((t) => t.net) }]}
                  format={compact}
                />
                <div className="mt-[0.6em] flex gap-[1.2em] text-xs text-fg-muted">
                  <span className="inline-flex items-center gap-[0.4em]"><span className="size-[0.7em] rounded-full bg-chart-1" />Coût employeur</span>
                  <span className="inline-flex items-center gap-[0.4em]"><span className="size-[0.7em] rounded-full bg-chart-4" />Net à payer</span>
                </div>
              </>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-fg-muted"><th className="py-[0.4em] text-start font-medium">Mois</th><th className="py-[0.4em] text-end font-medium">Coût employeur (DA)</th><th className="py-[0.4em] text-end font-medium">Net (DA)</th></tr></thead>
                <tbody>{trend.map((t) => (<tr key={t.label} className="border-t border-border-subtle"><td className="py-[0.4em]">{t.label}</td><td className="py-[0.4em] text-end num">{amount(t.employerCost, { decimals: 0 })}</td><td className="py-[0.4em] text-end num">{amount(t.net, { decimals: 0 })}</td></tr>))}</tbody>
              </table>
            )}
          </Card>
          <Card>
            <CardHeader title="Où en est le mois" description="Avancement des échéances de la paie" />
            <div className="flex flex-col gap-[1em] text-sm">
              {[
                ["Variables saisies", draft ? 100 : 0],
                ["Contrôles préalables résolus", draft && draft.step >= 4 ? 100 : 0],
                ["Paie validée", currentRun ? 100 : 0],
                ["Déclarations déposées", 0],
              ].map(([label, v]) => (
                <div key={label}>
                  <div className="mb-[0.35em] flex justify-between"><span className="text-fg-secondary">{label}</span><span className="text-fg-muted num">{v} %</span></div>
                  <Progress value={v} />
                </div>
              ))}
            </div>
            <p className="mt-[1.2em] text-xs text-fg-muted">G50 et CNAS d’octobre : à déposer avant le 20 novembre [à confirmer].</p>
          </Card>
        </div>

        <section aria-labelledby="runs-title">
          <h2 id="runs-title" className="mb-[0.8em] text-h3 font-semibold text-fg">Historique des paies</h2>
          <DataTable
            columns={columns}
            rows={rows}
            defaultSort={{ key: "period", dir: "desc" }}
            pageSize={8}
            empty={<EmptyState icon={Calculator} title="Aucune paie pour le moment" description="Lancez votre première paie : les variables sont préremplies depuis les congés, le pointage et les prêts." action={<Button href="/app/payroll/runs/new">Lancer la paie</Button>} />}
          />
        </section>
      </div>
    </>
  );
}

export default function PayrollHome() {
  return <AccessGate roles={["admin", "hr", "accountant"]}>{() => <Body />}</AccessGate>;
}
