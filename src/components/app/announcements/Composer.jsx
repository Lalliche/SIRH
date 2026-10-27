"use client";

import { useState } from "react";
import { Button, Modal, SelectInput, TextArea, TextInput, Toggle, toast } from "@/components/ui";
import { db, newId } from "@/lib/db";
import { TODAY } from "@/lib/clock";
import { CATEGORIES, audienceMembers } from "./helpers";

export default function Composer({ open, onClose, user, audiences, employees, departments, entities }) {
  const [form, setForm] = useState({ title: "", body: "", category: "hr", audience: "Tous", pinned: false });
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const size = audienceMembers(form.audience, employees, departments, entities).length;

  const submit = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Le titre est obligatoire.";
    if (form.body.trim().length < 10) e.body = "Rédigez au moins une phrase.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const a = { id: newId("an"), title: form.title.trim(), body: form.body.trim(), authorId: user.employeeId, date: TODAY, pinned: form.pinned, audience: form.audience, category: form.category, baseReads: 0, readBy: [], reactions: {} };
    db.insert("announcements", a, { prepend: true });
    db.audit(user.employeeId, "Annonce publiée", a.title, `${a.audience} · ${size} destinataires`);
    db.notify({ title: a.title, body: "Nouvelle annonce de l'entreprise.", href: `/app/announcements/${a.id}` });
    toast.success(`Annonce publiée pour ${size} personne${size > 1 ? "s" : ""}.`);
    onClose(a.id);
  };

  return (
    <Modal open={open} onClose={() => onClose()} title="Nouvelle annonce" description="Elle apparaît dans le fil et déclenche une notification." footer={<><Button variant="ghost" onClick={() => onClose()}>Annuler</Button><Button onClick={submit}>Publier</Button></>}>
      <form className="grid gap-[1em] sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <TextInput className="sm:col-span-2" label="Titre" required value={form.title} onChange={set("title")} error={errors.title} placeholder="Ex. Horaires pendant le mois de Ramadan" />
        <TextArea className="sm:col-span-2" label="Message" required rows={6} value={form.body} onChange={set("body")} error={errors.body} />
        <SelectInput label="Catégorie" value={form.category} onChange={set("category")} options={Object.entries(CATEGORIES).map(([value, c]) => ({ value, label: c.label }))} />
        <SelectInput label="Destinataires" value={form.audience} onChange={set("audience")} options={audiences} hint={`${size} personne${size > 1 ? "s" : ""} concernée${size > 1 ? "s" : ""}`} />
        <div className="flex items-center justify-between gap-[1em] rounded-md bg-bg-sunken px-[1em] py-[0.8em] sm:col-span-2">
          <div><p className="font-medium text-fg">Épingler en haut du fil</p><p className="text-xs text-fg-muted">Une seule annonce épinglée à la fois est recommandée.</p></div>
          <Toggle checked={form.pinned} onChange={set("pinned")} label="Épingler" />
        </div>
      </form>
    </Modal>
  );
}
