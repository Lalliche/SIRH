"use client";

import { PageSkeleton } from "@/components/app/_kit/Skeleton";
import { useMemo, useState } from "react";
import { Info, Save } from "lucide-react";
import { Badge, Button, Card, CardHeader, PageHeader, SelectInput, TextInput, Toggle, toast } from "@/components/ui";
import { LEAVE_TYPES } from "@/data/constants";
import { HOLIDAYS } from "@/lib/dates";
import { db, useDb } from "@/lib/db";
import { date } from "@/lib/format";
import { useCurrentUser } from "@/lib/use-current-user";
import LeaveNav from "./LeaveNav";
import { LeaveSwatch } from "./LeaveTypeTag";
import { COVER, PROOF_LABEL, policiesOf } from "./leave-utils";

const num = (v, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

export default function LeavePolicies() {
  const me = useCurrentUser();
  const settings = useDb((s) => s.settings);
  const saved = useMemo(() => policiesOf(settings), [settings]);
  const [draft, setDraft] = useState(null);
  const policies = draft ?? saved;
  const editable = me.role === "admin" || me.role === "hr";
  const dirty = draft && JSON.stringify(draft) !== JSON.stringify(saved);

  const edit = (fn) => setDraft((d) => { const base = structuredClone(d ?? saved); fn(base); return base; });
  const setType = (k, patch) => edit((p) => { p.types[k] = { ...p.types[k], ...patch }; });

  const save = () => {
    db.patchSettings({ leavePolicies: draft });
    db.audit(me.employeeId, "Politique de congés modifiée", "Types et règles d'acquisition", `${policies.accrual.perMonth} j/mois, plafond ${policies.accrual.cap} j`);
    setDraft(null);
    toast.success("Politiques enregistrées");
  };

  if (!me.ready) return <PageSkeleton />;

  return (
    <>
      <PageHeader title="Politiques de congé" description="Types de congé, prise en charge et règles d'acquisition appliqués aux demandes." />
      <LeaveNav />
      {!editable && (
        <p className="mb-[1em] flex items-center gap-[0.5em] rounded-md bg-info-bg px-[0.9em] py-[0.6em] text-sm text-info-fg"><Info className="size-[1.1em]" aria-hidden /> Lecture seule : seuls l’administrateur et les RH modifient les politiques.</p>
      )}

      <div className="grid gap-[1.25em] lg:grid-cols-[minmax(0,1fr)_minmax(0,22em)]">
        <div className="flex flex-col gap-[1.25em]">
          <Card>
            <CardHeader title="Acquisition" description="Appliquée à tous les salariés, mois travaillé par mois travaillé." action={<Badge tone="warning">À confirmer</Badge>} />
            <div className="grid gap-[1em] sm:grid-cols-2 xl:grid-cols-4">
              <TextInput label="Jours par mois" inputMode="decimal" disabled={!editable} value={String(policies.accrual.perMonth).replace(".", ",")} onChange={(v) => edit((p) => { p.accrual.perMonth = num(v); })} suffix="j" />
              <TextInput label="Plafond annuel" inputMode="numeric" disabled={!editable} value={String(policies.accrual.cap)} onChange={(v) => edit((p) => { p.accrual.cap = num(v); })} suffix="j" />
              <TextInput label="Report maximum" inputMode="numeric" disabled={!editable} value={String(policies.accrual.carryOver)} onChange={(v) => edit((p) => { p.accrual.carryOver = num(v); })} suffix="j" />
              <TextInput label="Début de période (MM-JJ)" disabled={!editable} value={policies.accrual.refStart} onChange={(v) => edit((p) => { p.accrual.refStart = v; })} hint="Ex. : 06-01 pour le 1er juin." />
            </div>
          </Card>

          <Card padded={false}>
            <div className="px-[1.5em] pt-[1.25em]"><CardHeader title="Types de congé" description="Prise en charge, justificatif et circuit de validation par type." /></div>
            <ul className="divide-y divide-border-subtle">
              {Object.entries(LEAVE_TYPES).map(([k, t]) => {
                const p = policies.types[k];
                return (
                  <li key={k} className="grid items-end gap-[0.9em] px-[1.5em] py-[1em] md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
                    <div className="flex items-center gap-[0.75em]">
                      <Toggle label={`${t.label} activé`} checked={p.enabled} onChange={(v) => editable && setType(k, { enabled: v })} size="sm" />
                      <LeaveSwatch type={k} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg">{t.label}</p>
                        <p className="text-xs text-fg-muted">{p.quota ? `${p.quota} j par ${k === "annual" ? "an" : "événement"}` : "Sans plafond fixe"}</p>
                      </div>
                    </div>
                    <SelectInput label="Pris en charge par" disabled={!editable} value={p.coveredBy} onChange={(v) => setType(k, { coveredBy: v })} options={Object.entries(COVER).map(([value, c]) => ({ value, label: c.label }))} />
                    <SelectInput label="Justificatif" disabled={!editable} value={p.proof} onChange={(v) => setType(k, { proof: v })} options={Object.entries(PROOF_LABEL).map(([value, label]) => ({ value, label }))} />
                    <SelectInput label="Validation" disabled={!editable} value={p.approval} onChange={(v) => setType(k, { approval: v })} options={["Manager", "Manager puis RH", "RH"]} />
                  </li>
                );
              })}
            </ul>
          </Card>

          {editable && (
            <div className="sticky bottom-[1em] z-10 flex items-center justify-end gap-[0.75em] rounded-lg border border-border bg-surface px-[1em] py-[0.7em] shadow-md">
              <span className="me-auto text-sm text-fg-secondary">{dirty ? "Modifications non enregistrées" : "Aucune modification"}</span>
              <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(null)}>Annuler</Button>
              <Button icon={Save} disabled={!dirty} onClick={save}>Enregistrer</Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader title="Jours fériés 2026" description="Non décomptés des congés. Les dates religieuses sont estimées." />
          <ul className="flex flex-col gap-[0.5em]">
            {HOLIDAYS.filter((h) => h.date.startsWith("2026")).map((h) => (
              <li key={h.date} className="flex items-center justify-between gap-[0.5em] text-sm">
                <span className="text-fg">{h.label}</span>
                <span className="flex items-center gap-[0.5em]">
                  {h.estimated && <Badge tone="neutral">estimé</Badge>}
                  <span className="num text-fg-secondary">{date(h.date)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
