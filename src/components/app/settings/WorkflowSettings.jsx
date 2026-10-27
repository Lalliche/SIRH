"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button, SelectInput, TextInput, toast } from "@/components/ui";
import { ROLES } from "@/data/constants";
import { db, useDb } from "@/lib/db";
import Section from "./Section";

const DEFAULTS = [
  { id: "leave", label: "Demandes de congé", steps: [{ role: "manager", condition: "Toujours" }, { role: "hr", condition: "Durée supérieure à 5 jours" }] },
  { id: "advance", label: "Avances sur salaire", steps: [{ role: "manager", condition: "Toujours" }, { role: "hr", condition: "Toujours" }, { role: "admin", condition: "Montant supérieur à 50 000 DA" }] },
  { id: "attestation", label: "Attestations et documents", steps: [{ role: "hr", condition: "Toujours" }] },
  { id: "expense", label: "Notes de frais", steps: [{ role: "manager", condition: "Toujours" }, { role: "accountant", condition: "Montant supérieur à 20 000 DA" }] },
];
const roleOptions = Object.entries(ROLES).filter(([k]) => k !== "employee").map(([value, r]) => ({ value, label: r.label }));

function Chain({ flow, user }) {
  const [steps, setSteps] = useState(flow.steps);
  const dirty = JSON.stringify(steps) !== JSON.stringify(flow.steps);
  const upd = (i, patch) => setSteps((l) => l.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i, d) => setSteps((l) => { const n = [...l]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; });
  const save = () => {
    if (steps.length === 0) return toast.error("Un circuit doit comporter au moins une étape.");
    db.update("settings", (s) => ({ ...s, workflows: (s.workflows ?? DEFAULTS).map((w) => (w.id === flow.id ? { ...w, steps } : w)) }));
    db.audit(user.employeeId, "Circuit de validation modifié", flow.label, steps.map((s) => ROLES[s.role].short).join(" → "));
    toast.success(`Circuit « ${flow.label} » enregistré.`);
  };
  return (
    <Section
      title={flow.label}
      description={steps.map((s) => ROLES[s.role].short).join("  →  ")}
      footer={<><Button variant="ghost" disabled={!dirty} onClick={() => setSteps(flow.steps)}>Annuler</Button><Button disabled={!dirty} onClick={save}>Enregistrer</Button></>}
    >
      <ol className="flex flex-col gap-[0.7em]">
        {steps.map((s, i) => (
          <li key={i} className="grid items-end gap-[0.7em] rounded-lg border border-border-subtle p-[0.8em] sm:grid-cols-[2em_1fr_1.4fr_auto]">
            <span className="flex size-[1.8em] items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-link num sm:mb-[0.4em]">{i + 1}</span>
            <SelectInput label="Validateur" value={s.role} onChange={(v) => upd(i, { role: v })} options={roleOptions} />
            <TextInput label="Condition" value={s.condition} onChange={(v) => upd(i, { condition: v })} />
            <div className="flex gap-[0.2em]">
              <Button variant="ghost" size="icon" disabled={i === 0} aria-label="Monter l'étape" onClick={() => move(i, -1)}><ArrowUp className="size-[1.1em]" /></Button>
              <Button variant="ghost" size="icon" disabled={i === steps.length - 1} aria-label="Descendre l'étape" onClick={() => move(i, 1)}><ArrowDown className="size-[1.1em]" /></Button>
              <Button variant="ghost" size="icon" aria-label="Retirer l'étape" onClick={() => setSteps((l) => l.filter((_, j) => j !== i))}><X className="size-[1.1em]" /></Button>
            </div>
          </li>
        ))}
      </ol>
      <Button className="mt-[0.8em]" variant="soft" size="sm" icon={Plus} onClick={() => setSteps((l) => [...l, { role: "hr", condition: "Toujours" }])}>Ajouter une étape</Button>
    </Section>
  );
}

export default function WorkflowSettings({ user }) {
  const saved = useDb((s) => s.settings.workflows);
  const flows = saved ?? DEFAULTS;
  return (
    <div className="flex flex-col gap-[1.25em]">
      <p className="text-sm text-fg-secondary">Chaque demande suit ces étapes dans l&apos;ordre. Une étape conditionnelle n&apos;est sollicitée que si sa condition est remplie.</p>
      {flows.map((f) => <Chain key={`${f.id}-${JSON.stringify(f.steps)}`} flow={f} user={user} />)}
    </div>
  );
}
