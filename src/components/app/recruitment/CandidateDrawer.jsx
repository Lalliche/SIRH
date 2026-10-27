"use client";

import { useState } from "react";
import { ArrowRight, Calendar, Mail, Phone, UserPlus, XCircle } from "lucide-react";
import { Avatar, Badge, Button, Drawer, SelectInput, TextArea, toast } from "@/components/ui";
import ProgressRing from "@/components/app/_kit/ProgressRing";
import { db, newId } from "@/lib/db";
import { TODAY } from "@/lib/clock";
import { date, dateLong, fullName } from "@/lib/format";
import { CRITERIA, REJECT_REASONS, STAGES, STAGE_BY_KEY, employeeLink, scorecardAverage, daysInStage } from "./helpers";

function Rating({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-[1em] py-[0.5em]">
      <span id={`r-${label}`} className="text-sm text-fg-secondary">{label}</span>
      <div role="radiogroup" aria-labelledby={`r-${label}`} className="flex gap-[0.3em]">
        {[1, 2, 3, 4, 5].map((n) => (
          <Button key={n} role="radio" aria-checked={value === n} aria-label={`${n} sur 5`} size="sm" variant={value >= n ? "primary" : "secondary"} className="!w-[2em] !px-0" onClick={() => onChange(value === n ? 0 : n)}>{n}</Button>
        ))}
      </div>
    </div>
  );
}

export default function CandidateDrawer({ candidate, job, employees, user, canEdit, onMove, onClose }) {
  const [note, setNote] = useState("");
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [rejecting, setRejecting] = useState(false);
  if (!candidate) return <Drawer open={false} onClose={onClose} title="" />;

  const sc = candidate.scorecard ?? {};
  const avg = scorecardAverage(candidate);
  const notes = candidate.notes ?? [];
  const stage = STAGE_BY_KEY[candidate.stage];
  const idx = STAGES.findIndex((s) => s.key === candidate.stage);
  const next = idx < 3 ? STAGES[idx + 1] : idx === 3 ? STAGES[4] : null;

  const rate = (key, v) => db.patch("candidates", candidate.id, { scorecard: { ...sc, [key]: v } });
  const addNote = () => {
    if (!note.trim()) return;
    db.patch("candidates", candidate.id, { notes: [{ id: newId("nt"), authorId: user.employeeId, at: TODAY, text: note.trim() }, ...notes] });
    setNote("");
  };
  const reject = () => {
    db.patch("candidates", candidate.id, { rejectReason: reason });
    onMove(candidate, "rejected");
    setRejecting(false);
  };
  const convert = () => {
    db.patch("candidates", candidate.id, { convertedAt: TODAY });
    db.audit(user.employeeId, "Candidat converti en employé", candidate.name, job?.title ?? "");
    toast.success("Fiche employé préremplie.");
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width="32em"
      title={candidate.name}
      description={job?.title}
      footer={
        canEdit ? (
          candidate.stage === "hired" ? (
            <Button href={employeeLink(candidate, job)} icon={UserPlus} onClick={convert}>Créer l&apos;employé</Button>
          ) : candidate.stage === "rejected" ? (
            <Button variant="secondary" onClick={() => onMove(candidate, "screening")}>Rouvrir la candidature</Button>
          ) : (
            <>
              <Button variant="danger" icon={XCircle} onClick={() => setRejecting(true)}>Refuser</Button>
              {next && <Button iconEnd={ArrowRight} onClick={() => onMove(candidate, next.key)}>Passer à « {next.label} »</Button>}
            </>
          )
        ) : null
      }
    >
      <div className="flex flex-col gap-[1.5em]">
        <div className="flex items-center gap-[1em]">
          <Avatar name={candidate.name} size="lg" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-[0.5em]">
              <Badge tone={stage.tone}>{stage.label}</Badge>
              {candidate.convertedAt && <Badge tone="success">Employé créé</Badge>}
            </div>
            <p className="mt-[0.4em] text-sm text-fg-muted">Dans cette étape depuis {daysInStage(candidate)} jour{daysInStage(candidate) > 1 ? "s" : ""}</p>
          </div>
          <ProgressRing value={candidate.score} size="4.2em" tone={candidate.score >= 85 ? "success" : "primary"} label={`Adéquation ${candidate.score} sur 100`}>
            <span className="text-sm font-semibold text-fg num">{candidate.score}</span>
          </ProgressRing>
        </div>

        {canEdit && (
          <SelectInput label="Étape" value={candidate.stage} onChange={(v) => v !== candidate.stage && onMove(candidate, v)} options={STAGES.map((s) => ({ value: s.key, label: s.label }))} />
        )}

        {rejecting && (
          <div className="rounded-md border border-danger/40 bg-danger-bg p-[1em]">
            <SelectInput label="Motif du refus" value={reason} onChange={setReason} options={REJECT_REASONS} />
            <div className="mt-[0.8em] flex justify-end gap-[0.5em]"><Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>Annuler</Button><Button variant="danger-solid" size="sm" onClick={reject}>Confirmer le refus</Button></div>
          </div>
        )}
        {candidate.rejectReason && candidate.stage === "rejected" && <p className="text-sm text-fg-secondary">Motif : {candidate.rejectReason}</p>}

        <dl className="grid grid-cols-2 gap-[0.9em] text-sm">
          <div><dt className="text-xs text-fg-muted">Source</dt><dd className="font-medium text-fg">{candidate.source}</dd></div>
          <div><dt className="flex items-center gap-[0.3em] text-xs text-fg-muted"><Calendar className="size-[1em]" aria-hidden />Candidature</dt><dd className="text-fg">{date(candidate.appliedAt)}</dd></div>
          <div><dt className="flex items-center gap-[0.3em] text-xs text-fg-muted"><Mail className="size-[1em]" aria-hidden />E-mail</dt><dd className="truncate text-fg">{candidate.email ?? "—"}</dd></div>
          <div><dt className="flex items-center gap-[0.3em] text-xs text-fg-muted"><Phone className="size-[1em]" aria-hidden />Téléphone</dt><dd className="text-fg num">{candidate.phone ?? "—"}</dd></div>
        </dl>

        <section aria-labelledby="sc">
          <div className="mb-[0.3em] flex items-baseline justify-between">
            <h3 id="sc" className="font-semibold text-fg">Fiche d&apos;évaluation</h3>
            <span className="text-sm text-fg-muted">{avg != null ? <><span className="font-semibold text-fg num">{String(avg).replace(".", ",")}</span> / 5</> : "Non évalué"}</span>
          </div>
          <div className="divide-y divide-border-subtle">
            {CRITERIA.map((c) => (canEdit ? <Rating key={c.key} label={c.label} value={sc[c.key] ?? 0} onChange={(v) => rate(c.key, v)} /> : <div key={c.key} className="flex justify-between py-[0.5em] text-sm"><span className="text-fg-secondary">{c.label}</span><span className="num">{sc[c.key] ?? "—"}</span></div>))}
          </div>
        </section>

        <section aria-labelledby="nts">
          <h3 id="nts" className="mb-[0.6em] font-semibold text-fg">Notes d&apos;entretien</h3>
          {canEdit && (
            <div className="mb-[1em] flex flex-col items-end gap-[0.5em]">
              <TextArea className="w-full" rows={2} aria-label="Nouvelle note" placeholder="Impressions, points à creuser, prétentions…" value={note} onChange={setNote} />
              <Button size="sm" variant="secondary" disabled={!note.trim()} onClick={addNote}>Ajouter la note</Button>
            </div>
          )}
          {notes.length === 0 ? <p className="text-sm text-fg-muted">Aucune note pour l&apos;instant.</p> : (
            <ul className="flex flex-col gap-[0.8em]">
              {notes.map((n) => (
                <li key={n.id} className="rounded-md bg-bg-sunken p-[0.9em]">
                  <p className="text-sm text-fg">{n.text}</p>
                  <p className="mt-[0.3em] text-xs text-fg-muted">{fullName(employees.find((e) => e.id === n.authorId))} · {dateLong(n.at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Drawer>
  );
}
