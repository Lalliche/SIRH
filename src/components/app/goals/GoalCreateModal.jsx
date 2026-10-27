"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button, Modal, SelectInput, TextInput, toast } from "@/components/ui";
import { db, newId } from "@/lib/db";
import { fullName } from "@/lib/format";
import { quarterRange } from "./helpers";

const MAX_KR = 5;

export default function GoalCreateModal({ open, onClose, user, ownerOptions, reviewerOptions, quarters, defaultQuarter, preset, employees }) {
  const [title, setTitle] = useState(preset?.title ?? "");
  const [ownerId, setOwnerId] = useState(ownerOptions.some((e) => e.id === user.employeeId) ? user.employeeId : ownerOptions[0]?.id ?? "");
  const [reviewerId, setReviewerId] = useState(() => {
    const owner = employees.find((e) => e.id === (ownerOptions.some((x) => x.id === user.employeeId) ? user.employeeId : ownerOptions[0]?.id));
    return reviewerOptions.some((e) => e.id === owner?.managerId) ? owner.managerId : reviewerOptions[0]?.id ?? "";
  });
  const [quarter, setQuarter] = useState(defaultQuarter);
  const [dueDate, setDueDate] = useState(quarterRange(defaultQuarter).end);
  const [krs, setKrs] = useState(preset?.krs?.length ? preset.krs : ["", ""]);
  const [errors, setErrors] = useState({});

  const changeOwner = (id) => {
    setOwnerId(id);
    const m = employees.find((e) => e.id === id)?.managerId;
    if (m && reviewerOptions.some((e) => e.id === m)) setReviewerId(m);
  };
  const changeQuarter = (q) => { setQuarter(q); setDueDate(quarterRange(q).end); };
  const setKr = (i, v) => setKrs((l) => l.map((x, j) => (j === i ? v : x)));

  const submit = () => {
    const e = {};
    const clean = krs.map((k) => k.trim()).filter(Boolean);
    if (!title.trim()) e.title = "Formulez l'objectif en une phrase.";
    if (!ownerId) e.owner = "Choisissez un responsable.";
    if (!reviewerId) e.reviewer = "Choisissez un évaluateur.";
    else if (reviewerId === ownerId) e.reviewer = "L'évaluateur doit être une autre personne.";
    if (clean.length === 0) e.krs = "Ajoutez au moins un résultat clé mesurable.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const goal = {
      id: newId("gl"),
      employeeId: ownerId,
      reviewerId,
      title: title.trim(),
      progress: 0,
      dueDate,
      status: "on_track",
      quarter,
      keyResults: clean.map((text) => ({ id: newId("kr"), text, progress: 0 })),
      checkIns: [],
    };
    db.insert("goals", goal, { prepend: true });
    db.audit(user.employeeId, "Objectif créé", goal.title, `${quarter} · ${clean.length} résultats clés`);
    toast.success("Objectif créé.");
    onClose(goal);
  };

  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      title="Créer un objectif"
      description="Un objectif clair, 2 à 5 résultats clés mesurables."
      footer={<><Button variant="ghost" onClick={() => onClose()}>Annuler</Button><Button onClick={submit}>Créer l&apos;objectif</Button></>}
    >
      <form className="grid gap-[1em] sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <TextInput className="sm:col-span-2" label="Objectif" required value={title} onChange={setTitle} error={errors.title} placeholder="Ex. Ramener les ruptures de stock sous 2 %" />
        <SelectInput label="Responsable" required value={ownerId} onChange={changeOwner} error={errors.owner} disabled={ownerOptions.length <= 1} options={ownerOptions.map((e) => ({ value: e.id, label: fullName(e) }))} />
        <SelectInput label="Évaluateur" required value={reviewerId} onChange={setReviewerId} error={errors.reviewer} options={reviewerOptions.map((e) => ({ value: e.id, label: fullName(e) }))} />
        <SelectInput label="Trimestre" value={quarter} onChange={changeQuarter} options={quarters} />
        <TextInput label="Échéance" type="date" value={dueDate} onChange={setDueDate} />
        <fieldset className="sm:col-span-2">
          <legend className="mb-[0.4em] text-[0.8125em] font-medium text-fg-secondary">Résultats clés <span className="font-normal text-fg-muted">(obligatoire)</span></legend>
          <div className="flex flex-col gap-[0.5em]">
            {krs.map((k, i) => (
              <div key={i} className="flex items-center gap-[0.4em]">
                <TextInput className="flex-1" aria-label={`Résultat clé ${i + 1}`} placeholder={`Résultat clé ${i + 1}`} value={k} onChange={(v) => setKr(i, v)} />
                {krs.length > 1 && <Button variant="ghost" size="icon" aria-label={`Retirer le résultat clé ${i + 1}`} onClick={() => setKrs((l) => l.filter((_, j) => j !== i))}><X className="size-[1.1em]" /></Button>}
              </div>
            ))}
          </div>
          {errors.krs && <p role="alert" className="mt-[0.4em] text-[0.8125em] text-danger-fg">{errors.krs}</p>}
          {krs.length < MAX_KR && <Button className="mt-[0.5em]" variant="ghost" size="sm" icon={Plus} onClick={() => setKrs((l) => [...l, ""])}>Ajouter un résultat clé</Button>}
        </fieldset>
      </form>
    </Modal>
  );
}
