"use client";

import { useRef, useState } from "react";
import { CalendarDays, FileUp, MapPin, Paperclip, Trash2, UserMinus, UserPlus, Wallet, ShieldAlert } from "lucide-react";
import { Avatar, Badge, Button, Drawer, Progress, SelectInput, StatusBadge, toast } from "@/components/ui";
import { db, newId } from "@/lib/db";
import { TODAY } from "@/lib/clock";
import { date, fullName, money, pluralize } from "@/lib/format";
import { fileSize } from "@/components/app/_kit/csv";
import { isActive } from "@/components/app/_kit/metrics";
import { TRAINING_STATUS, statusOf } from "./helpers";

function Fact({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-[0.75em]">
      <Icon className="mt-[0.2em] size-[1.1em] shrink-0 text-fg-muted" aria-hidden strokeWidth={1.6} />
      <div>
        <p className="text-xs text-fg-muted">{label}</p>
        <p className="text-fg">{children}</p>
      </div>
    </div>
  );
}

export default function TrainingDrawer({ training, employees, user, manageableIds, canManage, onClose, onCancel }) {
  const fileRef = useRef(null);
  const [pick, setPick] = useState("");
  if (!training) return <Drawer open={false} onClose={onClose} title="" />;

  const status = statusOf(training);
  const closed = status === "done" || status === "cancelled";
  const people = training.participantIds.map((id) => employees.find((e) => e.id === id)).filter(Boolean);
  const left = training.seats - training.participantIds.length;
  const mine = training.participantIds.includes(user.employeeId);
  const candidates = employees.filter((e) => isActive(e) && !training.participantIds.includes(e.id) && (canManage || manageableIds.has(e.id)));
  const proofs = training.proofs ?? [];

  const setParticipants = (ids, action, who) => {
    db.patch("trainings", training.id, { participantIds: ids });
    db.audit(user.employeeId, action, training.title, who);
  };
  const enroll = (id) => {
    if (left <= 0) return toast.error("Session complète : plus aucune place disponible.");
    const e = employees.find((x) => x.id === id);
    setParticipants([...training.participantIds, id], "Inscription à une formation", fullName(e));
    toast.success(`${fullName(e)} est inscrit(e).`);
    setPick("");
  };
  const unenroll = (id) => {
    const e = employees.find((x) => x.id === id);
    setParticipants(training.participantIds.filter((x) => x !== id), "Désinscription d'une formation", fullName(e));
    toast.info(`${fullName(e)} est désinscrit(e).`, { action: { label: "Annuler", onClick: () => db.patch("trainings", training.id, { participantIds: training.participantIds }) } });
  };
  const addProof = (file) => {
    if (!file) return;
    const proof = { id: newId("pf"), name: file.name, size: file.size, at: TODAY, by: user.employeeId };
    db.patch("trainings", training.id, { proofs: [...proofs, proof] });
    db.audit(user.employeeId, "Justificatif ajouté", training.title, file.name);
    toast.success("Justificatif ajouté.");
  };
  const removeProof = (id) => db.patch("trainings", training.id, { proofs: proofs.filter((p) => p.id !== id) });

  return (
    <Drawer
      open
      onClose={onClose}
      width="32em"
      title={training.title}
      description={training.provider}
      footer={
        <>
          {canManage && !closed && <Button variant="danger" onClick={() => onCancel(training)}>Annuler la session</Button>}
          {!closed && (mine ? (
            <Button variant="secondary" icon={UserMinus} onClick={() => unenroll(user.employeeId)}>Me désinscrire</Button>
          ) : (
            <Button icon={UserPlus} disabled={left <= 0} onClick={() => enroll(user.employeeId)}>{left <= 0 ? "Session complète" : "M'inscrire"}</Button>
          ))}
          {closed && <Button variant="secondary" onClick={onClose}>Fermer</Button>}
        </>
      }
    >
      <div className="flex flex-col gap-[1.5em]">
        <div className="flex flex-wrap gap-[0.5em]">
          <StatusBadge status={status} map={TRAINING_STATUS} />
          {training.mandatory && <Badge tone="warning" icon={ShieldAlert}>Obligatoire</Badge>}
        </div>

        <div className="grid grid-cols-2 gap-[1em]">
          <Fact icon={CalendarDays} label="Dates">{training.from === training.to ? date(training.from) : `${date(training.from)} → ${date(training.to)}`}</Fact>
          <Fact icon={MapPin} label="Organisme">{training.provider}</Fact>
          <Fact icon={Wallet} label="Coût total"><span className="num">{money(training.cost, { decimals: 0 })}</span></Fact>
          <Fact icon={Wallet} label="Par participant"><span className="num">{people.length ? money(Math.round(training.cost / people.length), { decimals: 0 }) : "—"}</span></Fact>
        </div>

        <section aria-labelledby="seats">
          <div className="mb-[0.5em] flex items-baseline justify-between">
            <h3 id="seats" className="font-semibold text-fg">Participants</h3>
            <span className={left <= 2 ? "text-sm font-medium text-warning-fg" : "text-sm text-fg-muted"}>
              {left > 0 ? `${pluralize(left, "place restante", "places restantes")}` : "Complet"} · {people.length}/{training.seats}
            </span>
          </div>
          <Progress value={people.length} max={training.seats} tone={left <= 0 ? "danger" : left <= 2 ? "warning" : "primary"} />

          {people.length === 0 ? (
            <p className="mt-[1em] rounded-md bg-bg-sunken p-[1em] text-sm text-fg-secondary">Aucun inscrit pour l&apos;instant.</p>
          ) : (
            <ul className="mt-[1em] flex flex-col">
              {people.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-[0.8em] border-b border-border-subtle py-[0.5em] last:border-0">
                  <span className="flex min-w-0 items-center gap-[0.7em]">
                    <Avatar employee={e} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-fg">{fullName(e)}</span>
                      <span className="block text-xs text-fg-muted">{e.matricule}</span>
                    </span>
                  </span>
                  {!closed && (canManage || manageableIds.has(e.id) || e.id === user.employeeId) && (
                    <Button variant="ghost" size="sm" aria-label={`Désinscrire ${fullName(e)}`} onClick={() => unenroll(e.id)}><UserMinus className="size-[1.1em]" /></Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {!closed && candidates.length > 0 && (canManage || manageableIds.size > 0) && (
            <div className="mt-[1em] flex items-end gap-[0.6em]">
              <SelectInput
                className="flex-1"
                aria-label="Inscrire un salarié"
                placeholder="Inscrire un salarié…"
                value={pick}
                onChange={setPick}
                options={candidates.map((e) => ({ value: e.id, label: fullName(e) }))}
              />
              <Button variant="soft" disabled={!pick || left <= 0} onClick={() => enroll(pick)}>Inscrire</Button>
            </div>
          )}
        </section>

        <section aria-labelledby="proofs">
          <div className="mb-[0.6em] flex items-center justify-between">
            <h3 id="proofs" className="font-semibold text-fg">Justificatifs</h3>
            {(canManage || status === "done") && (
              <>
                <input ref={fileRef} type="file" className="sr-only" tabIndex={-1} aria-label="Ajouter un justificatif" onChange={(e) => { addProof(e.target.files?.[0]); e.target.value = ""; }} />
                <Button variant="soft" size="sm" icon={FileUp} onClick={() => fileRef.current?.click()}>Ajouter</Button>
              </>
            )}
          </div>
          {proofs.length === 0 ? (
            <p className="text-sm text-fg-muted">Aucun justificatif. Joignez la convocation, la feuille d&apos;émargement ou les attestations de présence.</p>
          ) : (
            <ul className="flex flex-col gap-[0.4em]">
              {proofs.map((p) => (
                <li key={p.id} className="flex items-center gap-[0.7em] rounded-md border border-border-subtle px-[0.8em] py-[0.55em]">
                  <Paperclip className="size-[1.1em] shrink-0 text-fg-muted" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{p.name}</span>
                  <span className="text-xs text-fg-muted num">{fileSize(p.size)}</span>
                  {canManage && <Button variant="ghost" size="sm" aria-label={`Supprimer ${p.name}`} onClick={() => removeProof(p.id)}><Trash2 className="size-[1.05em]" /></Button>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Drawer>
  );
}
