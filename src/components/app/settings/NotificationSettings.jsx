"use client";

import { useState } from "react";
import { Button, SelectInput, Toggle, toast } from "@/components/ui";
import { db, useDb } from "@/lib/db";
import Section from "./Section";

const EVENTS = [
  { key: "leave", label: "Nouvelle demande de congé", hint: "Pour les validateurs" },
  { key: "payroll", label: "Paie prête à valider", hint: "Responsable RH, comptable" },
  { key: "deadline", label: "Échéance de déclaration (G50, CNAS)", hint: "J-10 et J-3" },
  { key: "contract", label: "Contrat ou période d'essai qui se termine", hint: "60 jours avant" },
  { key: "document", label: "Document qui expire", hint: "60 jours avant" },
  { key: "announce", label: "Nouvelle annonce", hint: "Toute l'entreprise" },
];
const CHANNELS = [["app", "Dans l'application"], ["email", "E-mail"], ["sms", "SMS"]];
const DEFAULTS = Object.fromEntries(EVENTS.map((e) => [e.key, { app: true, email: e.key !== "announce", sms: e.key === "deadline" }]));

export default function NotificationSettings({ user }) {
  const saved = useDb((s) => s.settings.notifPrefs);
  const base = saved ?? { digest: "instant", events: DEFAULTS };
  const [draft, setDraft] = useState(base);
  const dirty = JSON.stringify(draft) !== JSON.stringify(base);
  const toggle = (ev, ch, on) => setDraft((d) => ({ ...d, events: { ...d.events, [ev]: { ...d.events[ev], [ch]: on } } }));
  const save = () => {
    db.update("settings", (s) => ({ ...s, notifPrefs: draft }));
    db.audit(user.employeeId, "Préférences de notification modifiées", "Paramètres", "");
    toast.success("Préférences enregistrées.");
  };
  return (
    <Section
      title="Notifications"
      description="Choisissez ce qui est envoyé et par quel canal. Les e-mails et SMS sont simulés dans cette démonstration."
      footer={<><Button variant="ghost" disabled={!dirty} onClick={() => setDraft(base)}>Annuler</Button><Button disabled={!dirty} onClick={save}>Enregistrer</Button></>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Canaux de notification par événement</caption>
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">
              <th scope="col" className="pb-[0.6em] text-start">Événement</th>
              {CHANNELS.map(([k, l]) => <th key={k} scope="col" className="px-[1em] pb-[0.6em] text-center">{l}</th>)}
            </tr>
          </thead>
          <tbody>
            {EVENTS.map((e) => (
              <tr key={e.key} className="border-t border-border-subtle">
                <th scope="row" className="py-[0.7em] text-start font-normal"><span className="block font-medium text-fg">{e.label}</span><span className="block text-xs text-fg-muted">{e.hint}</span></th>
                {CHANNELS.map(([k, l]) => (
                  <td key={k} className="px-[1em] text-center"><Toggle size="sm" checked={!!draft.events[e.key]?.[k]} onChange={(on) => toggle(e.key, k, on)} label={`${e.label} : ${l}`} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SelectInput className="mt-[1.5em] max-w-[22em]" label="Fréquence des e-mails" value={draft.digest} onChange={(v) => setDraft((d) => ({ ...d, digest: v }))} options={[{ value: "instant", label: "Immédiatement" }, { value: "daily", label: "Résumé quotidien (8 h)" }, { value: "weekly", label: "Résumé hebdomadaire (dimanche)" }]} />
    </Section>
  );
}
