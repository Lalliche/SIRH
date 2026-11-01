"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CircleAlert, Scale } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import ProgressRing from "@/components/app/_kit/ProgressRing";
import { useDrafts, useParams, usePayrollRuns } from "@/components/app/payroll/hooks";
import { CURRENT_PERIOD, TODAY } from "@/lib/clock";
import { diffDays } from "@/lib/dates";
import { useCollection } from "@/lib/db";
import { amount, dateLong, dateShort, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import CalendarGrid, { DOT } from "./CalendarGrid";
import SnmgImpact from "./SnmgImpact";
import { buildChecklist, buildEvents, scoreOf } from "./checks";

function RatesCard({ params }) {
  const rows = [
    ["SNMG mensuel", `${amount(params.snmg, { decimals: 0 })} DA`, "Vérifié", "Décret présidentiel 26-01 du 7 janvier 2026, JO n°1 du 8/01/2026"],
    ["CNAS part salarié", percent(params.cnasEmployee * 100), "Vérifié", "Loi n°83-14 du 2 juillet 1983 (presse algérienne)"],
    ["CNAS part employeur", percent(params.cnasEmployer * 100), "Vérifié", "Loi n°83-14 du 2 juillet 1983 (25 %, et non 26 %)"],
    ["FNPOS (œuvres sociales)", percent(params.fnpos * 100), "Vérifié", "Loi n°83-14 du 2 juillet 1983 — payé par l'employeur"],
    ["Exonération IRG", `≤ ${amount(params.irgExemptUpTo, { decimals: 0 })} DA`, "Vérifié", "Art. 104 CIDTA, modifié art. 31 loi de finances 2022"],
    ["Abattement IRG", `${percent(params.abattement.rate * 100, 0)} (${amount(params.abattement.min, { decimals: 0 })} à ${amount(params.abattement.max, { decimals: 0 })} DA)`, "Vérifié", "Art. 31 loi de finances 2022"],
    ["Lissage 30 001 – 35 000 DA", "137/51 − 27 925/8", "À confirmer", "Formule reprise de la presse spécialisée, non lue directement au Journal officiel"],
    ["Arrondi imposable à la dizaine", params.irgRoundTo10 ? "Activé" : "Désactivé", "À confirmer", "Pratique logiciel"],
  ];
  return (
    <Card>
      <CardHeader title="Taux et seuils en vigueur" description={`À jour au ${dateLong(params.effectiveFrom)}`} />
      <dl className="divide-y divide-border-subtle text-sm">
        {rows.map(([k, v, s, src]) => (
          <div key={k} className="flex flex-wrap items-center justify-between gap-x-[1em] gap-y-[0.2em] py-[0.55em]">
            <dt className="min-w-0"><span className="text-fg-secondary">{k}</span><span className="block text-xs text-fg-muted">{src}</span></dt>
            <dd className="flex items-center gap-[0.6em]"><span className="font-medium text-fg num">{v}</span><Badge tone={s === "Vérifié" ? "success" : "warning"} dot={false} icon={s === "Vérifié" ? CheckCircle2 : CircleAlert}>{s}</Badge></dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function Body() {
  const params = useParams();
  const declarations = useCollection("declarations");
  const employees = useCollection("employees");
  const documents = useCollection("documents");
  const runs = usePayrollRuns();
  const drafts = useDrafts();
  const [month, setMonth] = useState(TODAY.slice(0, 7));
  const [selected, setSelected] = useState(TODAY);

  const events = useMemo(() => buildEvents({ declarations, employees, documents, runs, today: TODAY, currentPeriod: CURRENT_PERIOD }), [declarations, employees, documents, runs]);
  const checklist = useMemo(() => buildChecklist({ employees, documents, declarations, runs, drafts, params, today: TODAY, currentPeriod: CURRENT_PERIOD }), [employees, documents, declarations, runs, drafts, params]);
  const score = scoreOf(checklist);
  const okCount = checklist.filter((c) => c.ok).length;
  const upcoming = useMemo(() => events.filter((e) => e.date >= TODAY && e.kind !== "holiday" && !e.done).slice(0, 7), [events]);
  const dayEvents = events.filter((e) => e.date === selected);
  const nextHolidays = events.filter((e) => e.kind === "holiday" && e.date >= TODAY).slice(0, 2);
  const tone = score >= 90 ? "success" : score >= 65 ? "primary" : "warning";

  return (
    <>
      <PageHeader eyebrow="Entreprise" title="Conformité" description="Échéances fiscales et sociales, contrats, documents et complétude des dossiers. Ce qui est en retard remonte en premier." />

      <div className="grid gap-[1.25em] lg:grid-cols-[minmax(0,22em)_minmax(0,1fr)]">
        <Card className="flex flex-col items-center text-center">
          <ProgressRing value={score} size="9em" stroke={8} tone={tone} label={`Score de conformité : ${score} %`}>
            <span className="font-display text-[2.2em] font-semibold leading-none text-fg num">{score}<span className="text-[0.45em] text-fg-muted"> %</span></span>
          </ProgressRing>
          <p className="mt-[0.9em] font-medium text-fg">{okCount} contrôles sur {checklist.length} conformes</p>
          <p className="mt-[0.2em] text-sm text-fg-muted">Calculé en direct sur vos dossiers, vos documents et vos déclarations.</p>
          {nextHolidays.length > 0 && <p className="mt-[1em] border-t border-border-subtle pt-[0.8em] text-xs text-fg-muted">Prochain jour férié : {nextHolidays[0].label}, {dateShort(nextHolidays[0].date)}{nextHolidays[0].detail.includes("estimée") ? " (estimé)" : ""}</p>}
        </Card>

        <Card>
          <CardHeader title="Complétude et conformité" description="Un clic pour corriger chaque point" />
          <ul className="divide-y divide-border-subtle">
            {checklist.map((c) => (
              <li key={c.id} className="flex items-center gap-[0.8em] py-[0.65em]">
                {c.ok ? <CheckCircle2 className="size-[1.25em] shrink-0 text-success" aria-hidden /> : <CircleAlert className="size-[1.25em] shrink-0 text-warning" aria-hidden />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">{c.label}</p>
                  <p className="text-xs text-fg-muted">{c.detail}</p>
                </div>
                <span className="sr-only">{c.ok ? "Conforme" : "À traiter"}</span>
                {!c.ok && <Button size="sm" variant="soft" href={c.href} iconEnd={ArrowRight}>{c.cta}</Button>}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-[1.25em] grid gap-[1.25em] xl:grid-cols-[minmax(0,1fr)_22em]">
        <Card>
          <CalendarGrid month={month} onMonth={setMonth} events={events} selected={selected} onSelect={setSelected} today={TODAY} />
          <div className="mt-[1.1em] border-t border-border-subtle pt-[0.9em]">
            <h4 className="mb-[0.5em] text-sm font-semibold text-fg">{dateLong(selected)}</h4>
            {dayEvents.length === 0 ? (
              <p className="text-sm text-fg-muted">Aucune échéance ce jour-là.</p>
            ) : (
              <ul className="flex flex-col gap-[0.5em]">
                {dayEvents.map((e) => (
                  <li key={e.id} className="flex items-center gap-[0.7em] text-sm">
                    <span aria-hidden className={cn("size-[0.7em] shrink-0 rounded-full", DOT[e.tone])} />
                    <span className="min-w-0 flex-1"><span className="font-medium text-fg">{e.label}</span><span className="block text-xs text-fg-muted">{e.detail}</span></span>
                    {e.href && <Button size="sm" variant="ghost" href={e.href}>{e.action}</Button>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="À venir" description="Prochaines échéances" />
          {upcoming.length === 0 ? (
            <EmptyState className="!py-[1.5em]" icon={Scale} title="Rien à signaler" description="Aucune échéance dans les semaines à venir." />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {upcoming.map((e) => {
                const d = diffDays(TODAY, e.date);
                return (
                  <li key={e.id} className="py-[0.7em]">
                    <div className="flex items-start gap-[0.7em]">
                      <span aria-hidden className={cn("mt-[0.45em] size-[0.7em] shrink-0 rounded-full", DOT[e.tone])} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-fg">{e.label}</p>
                        <p className="text-xs text-fg-muted">{dateShort(e.date)} · {d === 0 ? "aujourd'hui" : `dans ${d} jour${d > 1 ? "s" : ""}`}</p>
                      </div>
                      {e.href && <Button size="sm" variant="soft" href={e.href}>{e.action}</Button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-[1.25em] grid gap-[1.25em] lg:grid-cols-2">
        <SnmgImpact />
        <RatesCard params={params} />
      </div>
    </>
  );
}

export default function CompliancePage() {
  return <AccessGate roles={["admin", "hr", "accountant"]}>{() => <Body />}</AccessGate>;
}
