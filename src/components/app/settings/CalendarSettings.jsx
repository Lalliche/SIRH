"use client";

import { useState } from "react";
import { Check, Moon } from "lucide-react";
import { Badge, Button, Checkbox, SelectInput, TextInput, Toggle, toast } from "@/components/ui";
import { db, useDb } from "@/lib/db";
import { HOLIDAYS } from "@/lib/dates";
import { WEEKDAYS, date } from "@/lib/format";
import Section from "./Section";

const DEFAULTS = { workDays: [0, 1, 2, 3, 4], ramadan: { enabled: false, from: "2027-02-08", to: "2027-03-09", hours: 6 }, confirmed: [] };

export default function CalendarSettings({ user }) {
  const saved = useDb((s) => s.settings.calendar);
  const cal = { ...DEFAULTS, ...saved, ramadan: { ...DEFAULTS.ramadan, ...saved?.ramadan } };
  const [draft, setDraft] = useState(cal);
  const [year, setYear] = useState("2026");
  const dirty = JSON.stringify(draft) !== JSON.stringify(cal);

  const toggleDay = (d) => setDraft((c) => ({ ...c, workDays: c.workDays.includes(d) ? c.workDays.filter((x) => x !== d) : [...c.workDays, d].sort() }));
  const confirm = (d) => setDraft((c) => ({ ...c, confirmed: c.confirmed.includes(d) ? c.confirmed.filter((x) => x !== d) : [...c.confirmed, d] }));
  const setRam = (k) => (v) => setDraft((c) => ({ ...c, ramadan: { ...c.ramadan, [k]: v } }));

  const save = () => {
    if (draft.workDays.length === 0) return toast.error("Sélectionnez au moins un jour travaillé.");
    if (draft.ramadan.enabled && draft.ramadan.to < draft.ramadan.from) return toast.error("La fin de Ramadan précède son début.");
    db.update("settings", (s) => ({ ...s, calendar: draft }));
    db.audit(user.employeeId, "Calendrier de travail modifié", "Paramètres", `${draft.workDays.length} jours travaillés`);
    toast.success("Calendrier enregistré.");
  };

  const holidays = HOLIDAYS.filter((h) => h.date.startsWith(year));
  const weekend = [0, 1, 2, 3, 4, 5, 6].filter((d) => !draft.workDays.includes(d));

  return (
    <div className="flex flex-col gap-[1.25em]">
      <Section
        title="Semaine de travail"
        description={`Week-end : ${weekend.map((d) => WEEKDAYS[d]).join(" et ") || "aucun"}. La semaine algérienne standard va du dimanche au jeudi.`}
        footer={<><Button variant="ghost" disabled={!dirty} onClick={() => setDraft(cal)}>Annuler</Button><Button disabled={!dirty} onClick={save}>Enregistrer</Button></>}
      >
        <fieldset>
          <legend className="sr-only">Jours travaillés</legend>
          <div className="flex flex-wrap gap-[1.2em]">
            {WEEKDAYS.map((w, d) => <Checkbox key={w} className="capitalize" checked={draft.workDays.includes(d)} onChange={() => toggleDay(d)} label={w} />)}
          </div>
        </fieldset>

        <div className="mt-[1.5em] rounded-lg border border-border-subtle p-[1em]">
          <div className="flex items-center justify-between gap-[1em]">
            <div className="flex items-center gap-[0.7em]"><Moon className="size-[1.3em] text-fg-muted" aria-hidden /><div><p className="font-medium text-fg">Horaires réduits de Ramadan</p><p className="text-xs text-fg-muted">Les dates sont estimées selon l&apos;observation de la lune : confirmez-les le moment venu.</p></div></div>
            <Toggle checked={draft.ramadan.enabled} onChange={setRam("enabled")} label="Activer les horaires de Ramadan" />
          </div>
          {draft.ramadan.enabled && (
            <div className="mt-[1em] grid gap-[1em] sm:grid-cols-3">
              <TextInput label="Début" type="date" value={draft.ramadan.from} onChange={setRam("from")} />
              <TextInput label="Fin" type="date" value={draft.ramadan.to} onChange={setRam("to")} />
              <TextInput label="Heures par jour" type="number" min="1" max="8" step="0.5" value={String(draft.ramadan.hours)} onChange={(v) => setRam("hours")(Number(v))} />
            </div>
          )}
        </div>
      </Section>

      <Section
        title="Jours fériés"
        description="Les fêtes religieuses sont estimées jusqu'à confirmation. Elles pilotent le calcul des jours ouvrés, des congés et de la paie."
        action={<SelectInput aria-label="Année" className="w-[7em]" value={year} onChange={setYear} options={["2026", "2027"]} />}
        footer={<><Button variant="ghost" disabled={!dirty} onClick={() => setDraft(cal)}>Annuler</Button><Button disabled={!dirty} onClick={save}>Enregistrer</Button></>}
      >
        <ul className="divide-y divide-border-subtle">
          {holidays.map((h) => {
            const ok = draft.confirmed.includes(h.date);
            return (
              <li key={h.date} className="flex flex-wrap items-center gap-x-[1em] gap-y-[0.3em] py-[0.6em]">
                <span className="w-[8em] text-sm text-fg-secondary num">{date(h.date)}</span>
                <span className="flex-1 font-medium text-fg">{h.label}</span>
                {h.estimated ? (
                  <>
                    <Badge tone={ok ? "success" : "warning"} icon={ok ? Check : undefined}>{ok ? "Confirmée" : "Estimée"}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => confirm(h.date)}>{ok ? "Remettre en estimation" : "Confirmer"}</Button>
                  </>
                ) : <Badge tone="neutral">Date fixe</Badge>}
              </li>
            );
          })}
          {holidays.length === 0 && <li className="py-[1em] text-sm text-fg-muted">Aucun jour férié défini pour cette année.</li>}
        </ul>
      </Section>
    </div>
  );
}
