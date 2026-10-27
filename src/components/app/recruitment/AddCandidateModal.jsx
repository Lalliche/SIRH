"use client";

import { useState } from "react";
import { Button, Modal, SelectInput, TextInput, toast } from "@/components/ui";
import { db, newId } from "@/lib/db";
import { TODAY } from "@/lib/clock";
import { SOURCES } from "./helpers";

export default function AddCandidateModal({ open, onClose, job, existing, actorId }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", source: SOURCES[0] });
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Nom et prénom requis.";
    const dup = existing.find((c) => (form.email && c.email === form.email.trim()) || c.name.toLowerCase() === form.name.trim().toLowerCase());
    if (dup) e.name = `Doublon possible : « ${dup.name} » existe déjà sur ce poste.`;
    setErrors(e);
    if (Object.keys(e).length) return;
    const c = { id: newId("cd"), jobId: job.id, name: form.name.trim(), stage: "new", score: 60, source: form.source, appliedAt: TODAY, stageAt: TODAY, email: form.email.trim() || undefined, phone: form.phone.trim() || undefined };
    db.insert("candidates", c);
    db.audit(actorId, "Candidat ajouté", c.name, job.title);
    toast.success(`${c.name} ajouté(e) à « Nouveau ».`);
    onClose(c.id);
  };

  return (
    <Modal open={open} onClose={() => onClose()} title="Ajouter un candidat" description={job.title} footer={<><Button variant="ghost" onClick={() => onClose()}>Annuler</Button><Button onClick={submit}>Ajouter</Button></>}>
      <form className="grid gap-[1em] sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <TextInput className="sm:col-span-2" label="Nom complet" required value={form.name} onChange={set("name")} error={errors.name} placeholder="Ex. Nacera Belhadj" />
        <TextInput label="E-mail" type="email" value={form.email} onChange={set("email")} />
        <TextInput label="Téléphone" type="tel" value={form.phone} onChange={set("phone")} placeholder="05 55 12 34 56" />
        <SelectInput className="sm:col-span-2" label="Source" value={form.source} onChange={set("source")} options={SOURCES} />
      </form>
    </Modal>
  );
}
