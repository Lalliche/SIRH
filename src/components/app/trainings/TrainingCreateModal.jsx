"use client";

import { useState } from "react";
import { Button, Modal, TextInput, Toggle, toast } from "@/components/ui";
import { db, newId } from "@/lib/db";
import { TODAY } from "@/lib/clock";

const blank = { title: "", provider: "", from: "", to: "", seats: "12", cost: "", mandatory: false };

export default function TrainingCreateModal({ open, onClose, actorId, preset }) {
  // Remounted with a key by the parent each time it opens, so initial state is always fresh.
  const [form, setForm] = useState({ ...blank, ...preset });
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Donnez un intitulé à la formation.";
    if (!form.provider.trim()) e.provider = "Indiquez l'organisme de formation.";
    if (!form.from) e.from = "Date de début requise.";
    else if (form.from < TODAY) e.from = "La date de début ne peut pas être passée.";
    if (form.to && form.from && form.to < form.from) e.to = "La fin précède le début.";
    if (!(Number(form.seats) >= 1)) e.seats = "Au moins 1 place.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const training = {
      id: newId("tr"),
      title: form.title.trim(),
      provider: form.provider.trim(),
      from: form.from,
      to: form.to || form.from,
      seats: Number(form.seats),
      participantIds: [],
      status: "planned",
      cost: Number(form.cost) || 0,
      mandatory: form.mandatory,
      proofs: [],
    };
    db.insert("trainings", training, { prepend: true });
    db.audit(actorId, "Formation créée", training.title, `${training.seats} places`);
    toast.success("Formation créée. Vous pouvez maintenant inscrire des participants.");
    onClose(training.id);
  };

  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      title="Créer une formation"
      description="Planifiez une session, puis inscrivez les participants."
      footer={
        <>
          <Button variant="ghost" onClick={() => onClose()}>Annuler</Button>
          <Button onClick={submit}>Créer la formation</Button>
        </>
      }
    >
      <form className="grid gap-[1em] sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <TextInput className="sm:col-span-2" label="Intitulé" required value={form.title} onChange={set("title")} error={errors.title} placeholder="Ex. Secourisme en entreprise" />
        <TextInput className="sm:col-span-2" label="Organisme" required value={form.provider} onChange={set("provider")} error={errors.provider} placeholder="Ex. Croissant-Rouge algérien" />
        <TextInput label="Début" type="date" required value={form.from} onChange={set("from")} error={errors.from} />
        <TextInput label="Fin" type="date" value={form.to} onChange={set("to")} error={errors.to} hint="Laissez vide pour une session d'un jour." />
        <TextInput label="Places" type="number" min="1" inputMode="numeric" value={form.seats} onChange={set("seats")} error={errors.seats} />
        <TextInput label="Coût total" type="number" min="0" inputMode="decimal" value={form.cost} onChange={set("cost")} suffix="DA" />
        <div className="flex items-center justify-between gap-[1em] rounded-md bg-bg-sunken px-[1em] py-[0.8em] sm:col-span-2">
          <div>
            <p className="font-medium text-fg">Formation obligatoire</p>
            <p className="text-xs text-fg-muted">Suivie dans le bandeau de conformité (sécurité, habilitations…).</p>
          </div>
          <Toggle checked={form.mandatory} onChange={set("mandatory")} label="Formation obligatoire" />
        </div>
      </form>
    </Modal>
  );
}
