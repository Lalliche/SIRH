"use client";

import { CheckCircle2, Info } from "lucide-react";
import { Card, CardHeader, Checkbox, SelectInput, StatusBadge, TextInput } from "@/components/ui";
import { PAYROLL_STATUS } from "@/data/constants";
import { useCollection } from "@/lib/db";
import { amount, int, periodLabel } from "@/lib/format";
import { prevPeriod } from "@/lib/payroll-run";
import { periodTitle } from "../utils";

function toggle(list, id, on) {
  return on ? [...new Set([...list, id])] : list.filter((x) => x !== id);
}

export default function StepPeriod({ view, update, model }) {
  const entities = useCollection("entities");
  const departments = useCollection("departments");
  const declarations = useCollection("declarations");
  const prev = model.prevRun;
  const prevG50 = declarations.find((d) => d.kind === "G50" && d.period === prevPeriod(view.period));
  const entries = model.diff.filter((d) => d.kind === "entree").length;
  const exits = model.diff.filter((d) => d.kind === "sortie").length;

  return (
    <div className="grid gap-[1.25em] lg:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col gap-[1.25em]">
        <Card>
          <CardHeader title="Période" description="Les périodes déjà validées ne sont pas proposées." />
          <div className="grid gap-[1em] sm:grid-cols-2">
            <SelectInput label="Mois de paie" value={view.period} onChange={() => {}} options={[{ value: view.period, label: periodTitle(view.period) }]} />
            <TextInput label="Date de paiement" type="date" value={view.payDate} onChange={(v) => update({ payDate: v })} hint="Virement groupé, jour ouvré (dimanche à jeudi)." />
          </div>
          <div className="mt-[1.1em] flex items-start gap-[0.7em] rounded-md bg-bg-sunken p-[0.9em] text-sm">
            {prev ? <CheckCircle2 className="mt-[0.1em] size-[1.2em] shrink-0 text-success" aria-hidden /> : <Info className="mt-[0.1em] size-[1.2em] shrink-0 text-info" aria-hidden />}
            <div className="min-w-0">
              {prev ? (
                <>
                  <p className="flex flex-wrap items-center gap-[0.6em] font-medium text-fg">Paie de {periodLabel(prev.period)} <StatusBadge status={prev.status} map={PAYROLL_STATUS} /></p>
                  <p className="mt-[0.2em] text-fg-secondary">
                    {int(prev.headcount)} bulletins, net {amount(prev.totals.net, { decimals: 0 })} DA. Elle sert de référence pour le tableau des écarts.
                    {prevG50 ? ` G50 ${prevG50.status === "filed" ? "déposé" : "à déposer"}.` : ""}
                  </p>
                </>
              ) : (
                <p className="text-fg-secondary">Aucune paie précédente : pas de comparaison possible pour ce mois.</p>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Périmètre" description="Sélectionnez les établissements et services à inclure dans ce lot." />
          <div className="grid gap-[1.5em] sm:grid-cols-2">
            <fieldset>
              <legend className="mb-[0.6em] text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Établissements</legend>
              <div className="flex flex-col gap-[0.6em]">
                {entities.map((e) => (
                  <Checkbox key={e.id} checked={view.scope.entityIds.includes(e.id)} onChange={(on) => update({ scope: { ...view.scope, entityIds: toggle(view.scope.entityIds, e.id, on) }, calcDone: false })} label={e.name} />
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-[0.6em] text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Services</legend>
              <div className="flex flex-col gap-[0.6em]">
                {departments.map((d) => (
                  <Checkbox key={d.id} checked={view.scope.departmentIds.includes(d.id)} onChange={(on) => update({ scope: { ...view.scope, departmentIds: toggle(view.scope.departmentIds, d.id, on) }, calcDone: false })} label={d.name} />
                ))}
              </div>
            </fieldset>
          </div>
        </Card>
      </div>

      <Card className="h-fit lg:sticky lg:top-[1em]">
        <CardHeader title="Aperçu du lot" />
        <p className="font-display text-kpi font-semibold text-fg num">{int(model.lines.length)} <span className="text-base font-normal text-fg-muted">salariés</span></p>
        <dl className="mt-[1em] flex flex-col gap-[0.6em] text-sm">
          <div className="flex justify-between"><dt className="text-fg-muted">Entrées du mois</dt><dd className="num">{entries}</dd></div>
          <div className="flex justify-between"><dt className="text-fg-muted">Sorties du mois</dt><dd className="num">{exits}</dd></div>
          <div className="flex justify-between"><dt className="text-fg-muted">Masse brute estimée</dt><dd className="num">{amount(model.totals.gross, { decimals: 0 })} DA</dd></div>
          <div className="flex justify-between"><dt className="text-fg-muted">Coût employeur estimé</dt><dd className="num">{amount(model.totals.employerCost, { decimals: 0 })} DA</dd></div>
        </dl>
        {model.lines.length === 0 && <p role="alert" className="mt-[1em] text-sm text-danger-fg">Aucun salarié dans le périmètre : cochez au moins un établissement et un service.</p>}
      </Card>
    </div>
  );
}
