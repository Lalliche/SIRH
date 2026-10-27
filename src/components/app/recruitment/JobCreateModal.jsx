"use client";

import { useState } from "react";
import { Button, Modal, SelectInput, TextInput, toast } from "@/components/ui";
import { db, newId } from "@/lib/db";
import { TODAY } from "@/lib/clock";
import { CONTRACT_TYPES } from "@/data/constants";

export default function JobCreateModal({ open, onClose, departments, entities, actorId }) {
  const [form, setForm] = useState({ title: "", departmentId: departments[0]?.id ?? "", entityId: entities[0]?.id ?? "", headcount: "1", contractType: "CDI", status: "open" });
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Intitulé du poste requis.";
    if (!(Number(form.headcount) >= 1)) e.headcount = "Au moins 1 poste.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const job = { id: newId("job"), title: form.title.trim(), departmentId: form.departmentId, entityId: form.entityId, status: form.status, openedAt: TODAY, headcount: Number(form.headcount), contractType: form.contractType };
    db.insert("jobs", job, { prepend: true });
    db.audit(actorId, "Offre créée", job.title, form.status === "open" ? "Publiée" : "Brouillon");
    toast.success("Offre créée.");
    onClose(job.id);
  };

  return (
    <Modal open={open} onClose={() => onClose()} title="Créer une offre" description="Vous pourrez ajouter les candidats ensuite (ANEM, Emploitic, LinkedIn…)." footer={<><Button variant="ghost" onClick={() => onClose()}>Annuler</Button><Button onClick={submit}>Créer l&apos;offre</Button></>}>
      <form className="grid gap-[1em] sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <TextInput className="sm:col-span-2" label="Intitulé du poste" required value={form.title} onChange={set("title")} error={errors.title} placeholder="Ex. Technicien de maintenance" />
        <SelectInput label="Service" value={form.departmentId} onChange={set("departmentId")} options={departments.map((d) => ({ value: d.id, label: d.name }))} />
        <SelectInput label="Site" value={form.entityId} onChange={set("entityId")} options={entities.map((e) => ({ value: e.id, label: e.name }))} />
        <SelectInput label="Contrat" value={form.contractType} onChange={set("contractType")} options={Object.entries(CONTRACT_TYPES).map(([value, label]) => ({ value, label }))} />
        <TextInput label="Postes à pourvoir" type="number" min="1" value={form.headcount} onChange={set("headcount")} error={errors.headcount} />
        <SelectInput className="sm:col-span-2" label="Statut" value={form.status} onChange={set("status")} options={[{ value: "open", label: "Ouvert : visible et candidatures acceptées" }, { value: "draft", label: "Brouillon" }]} />
      </form>
    </Modal>
  );
}
