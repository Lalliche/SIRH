"use client";

import { useState } from "react";
import { CalendarClock, Check, MessageSquarePlus, Plus, UserCheck } from "lucide-react";
import { Avatar, Button, Drawer, Segmented, TextArea, TextInput, toast } from "@/components/ui";
import ProgressRing from "@/components/app/_kit/ProgressRing";
import { db, newId } from "@/lib/db";
import { TODAY } from "@/lib/clock";
import { date, dateLong, fullName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/use-current-user";
import { GOAL_STATUS, expectedProgress, meanProgress, suggestStatus } from "./helpers";
import { StatusChip } from "./GoalCard";

function CheckInForm({ goal, kr, onDone }) {
  const [value, setValue] = useState(kr.progress);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState(null);
  const user = useCurrentUser();

  // Status proposed from the new overall progress; the author can override it.
  const nextKrs = goal.keyResults.map((k) => (k.id === kr.id ? { ...k, progress: value } : k));
  const nextProgress = meanProgress(nextKrs);
  const suggested = suggestStatus(nextProgress, goal.quarter);
  const chosen = status ?? suggested;

  const save = () => {
    const entry = { id: newId("ci"), krId: kr.id, krText: kr.text, at: TODAY, authorId: user.employeeId, from: kr.progress, to: value, comment: comment.trim() };
    db.patch("goals", goal.id, { keyResults: nextKrs, progress: nextProgress, status: nextProgress >= 100 ? "done" : chosen, checkIns: [entry, ...(goal.checkIns ?? [])] });
    toast.success(`Point d'avancement enregistré : ${nextProgress} % au total.`);
    onDone();
  };

  return (
    <div className="mt-[0.8em] rounded-md bg-bg-sunken p-[1em]">
      <div className="flex items-center gap-[1em]">
        <input
          type="range" min="0" max="100" step="5" value={value}
          aria-label={`Avancement de « ${kr.text} »`}
          onChange={(e) => setValue(Number(e.target.value))}
          className="h-[1.5em] flex-1 cursor-pointer accent-[var(--primary)]"
        />
        <span className="w-[3.2em] text-end font-semibold text-fg num">{value} %</span>
      </div>
      <TextArea className="mt-[0.7em]" rows={2} placeholder="Qu'est-ce qui a changé ? Un blocage ? (facultatif)" value={comment} onChange={setComment} aria-label="Commentaire" />
      <div className="mt-[0.8em] flex flex-wrap items-center justify-between gap-[0.8em]">
        <div className="flex flex-col gap-[0.3em]">
          <span className="text-xs text-fg-muted">Statut de l&apos;objectif {chosen !== suggested ? "" : "(suggéré)"}</span>
          <Segmented size="sm" value={nextProgress >= 100 ? "done" : chosen} onChange={setStatus} options={Object.entries(GOAL_STATUS).filter(([k]) => k !== "done").map(([value, s]) => ({ value, label: s.label }))} />
        </div>
        <div className="flex gap-[0.5em]">
          <Button variant="ghost" size="sm" onClick={onDone}>Annuler</Button>
          <Button size="sm" onClick={save} disabled={value === kr.progress && !comment.trim()}>Enregistrer</Button>
        </div>
      </div>
    </div>
  );
}

export default function GoalDrawer({ goal, owner, reviewer, employees, canEdit, onClose }) {
  const [editing, setEditing] = useState(null);
  const [newKr, setNewKr] = useState("");
  const user = useCurrentUser();
  if (!goal) return <Drawer open={false} onClose={onClose} title="" />;

  const krs = goal.keyResults ?? [];
  const history = goal.checkIns ?? [];
  const pace = expectedProgress(goal.quarter);

  const toggle = (kr) => {
    const to = kr.progress >= 100 ? 0 : 100;
    const nextKrs = krs.map((k) => (k.id === kr.id ? { ...k, progress: to } : k));
    const progress = meanProgress(nextKrs);
    db.patch("goals", goal.id, {
      keyResults: nextKrs,
      progress,
      status: progress >= 100 ? "done" : goal.status === "done" ? suggestStatus(progress, goal.quarter) : goal.status,
      checkIns: [{ id: newId("ci"), krId: kr.id, krText: kr.text, at: TODAY, authorId: user.employeeId, from: kr.progress, to, comment: to === 100 ? "Résultat clé atteint." : "Rouvert." }, ...history],
    });
  };
  const addKr = () => {
    if (!newKr.trim()) return;
    const nextKrs = [...krs, { id: newId("kr"), text: newKr.trim(), progress: 0 }];
    db.patch("goals", goal.id, { keyResults: nextKrs, progress: meanProgress(nextKrs) });
    setNewKr("");
  };

  return (
    <Drawer open onClose={onClose} width="34em" title={goal.title} description={`${goal.quarter} · échéance le ${date(goal.dueDate)}`}>
      <div className="flex flex-col gap-[1.5em]">
        <div className="flex items-center gap-[1.2em]">
          <ProgressRing value={goal.progress} size="6em" stroke={8} tone={GOAL_STATUS[goal.status]?.ring ?? "primary"} label={`${goal.progress} % d'avancement`}>
            <span className="font-display text-h2 font-semibold text-fg num">{goal.progress}<span className="text-sm">%</span></span>
          </ProgressRing>
          <div className="flex flex-col gap-[0.5em]">
            <StatusChip status={goal.status} />
            <p className="text-sm text-fg-secondary">Rythme attendu à ce jour : <span className="font-medium text-fg num">{pace} %</span></p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-[1em] rounded-md border border-border-subtle p-[1em] text-sm">
          <div>
            <dt className="mb-[0.3em] text-xs text-fg-muted">Responsable</dt>
            <dd className="flex items-center gap-[0.5em] text-fg"><Avatar employee={owner} size="xs" />{fullName(owner)}</dd>
          </div>
          <div>
            <dt className="mb-[0.3em] flex items-center gap-[0.3em] text-xs text-fg-muted"><UserCheck className="size-[1em]" aria-hidden />Évaluateur</dt>
            <dd className="flex items-center gap-[0.5em] text-fg"><Avatar employee={reviewer} size="xs" />{fullName(reviewer)}</dd>
          </div>
        </dl>

        <section aria-labelledby="krs">
          <h3 id="krs" className="mb-[0.6em] font-semibold text-fg">Résultats clés</h3>
          {krs.length === 0 && <p className="rounded-md bg-bg-sunken p-[1em] text-sm text-fg-secondary">Aucun résultat clé. Ajoutez des jalons mesurables pour suivre l&apos;objectif.</p>}
          <ul className="flex flex-col">
            {krs.map((kr) => (
              <li key={kr.id} className="border-b border-border-subtle py-[0.8em] last:border-0">
                <div className="flex items-start gap-[0.8em]">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={kr.progress >= 100}
                    aria-label={`Marquer « ${kr.text} » comme ${kr.progress >= 100 ? "non atteint" : "atteint"}`}
                    disabled={!canEdit}
                    onClick={() => toggle(kr)}
                    className={cn("mt-[0.15em] flex size-[1.4em] shrink-0 items-center justify-center rounded-xs border transition-colors", kr.progress >= 100 ? "border-primary bg-primary text-primary-fg" : "border-border-strong bg-surface hover:border-fg-faint", !canEdit && "opacity-60")}
                  >
                    {kr.progress >= 100 && <Check className="size-[1em]" strokeWidth={3} aria-hidden />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-fg", kr.progress >= 100 && "text-fg-muted line-through")}>{kr.text}</p>
                    <div className="mt-[0.4em] flex items-center gap-[0.7em]">
                      <div className="h-[0.35em] flex-1 overflow-hidden rounded-full bg-bg-sunken"><div className="h-full rounded-full bg-primary" style={{ width: `${kr.progress}%` }} /></div>
                      <span className="text-xs text-fg-muted num">{kr.progress} %</span>
                    </div>
                  </div>
                  {canEdit && kr.progress < 100 && editing !== kr.id && (
                    <Button variant="soft" size="sm" icon={MessageSquarePlus} onClick={() => setEditing(kr.id)}>Point</Button>
                  )}
                </div>
                {editing === kr.id && <CheckInForm goal={goal} kr={kr} onDone={() => setEditing(null)} />}
              </li>
            ))}
          </ul>
          {canEdit && (
            <form className="mt-[0.8em] flex items-end gap-[0.6em]" onSubmit={(e) => { e.preventDefault(); addKr(); }}>
              <TextInput className="flex-1" aria-label="Nouveau résultat clé" placeholder="Ajouter un résultat clé…" value={newKr} onChange={setNewKr} />
              <Button type="submit" variant="secondary" icon={Plus} disabled={!newKr.trim()}>Ajouter</Button>
            </form>
          )}
        </section>

        <section aria-labelledby="hist">
          <h3 id="hist" className="mb-[0.6em] flex items-center gap-[0.5em] font-semibold text-fg"><CalendarClock className="size-[1.1em] text-fg-muted" aria-hidden />Historique des points</h3>
          {history.length === 0 ? (
            <p className="text-sm text-fg-muted">Pas encore de point d&apos;avancement. Le premier est le plus utile.</p>
          ) : (
            <ol className="relative ms-[0.5em] flex flex-col gap-[1em] border-s border-border ps-[1.2em]">
              {history.slice(0, 8).map((h) => {
                const a = employees.find((e) => e.id === h.authorId);
                return (
                  <li key={h.id} className="relative">
                    <span aria-hidden className="absolute -start-[1.55em] top-[0.35em] size-[0.6em] rounded-full border-2 border-surface bg-primary" />
                    <p className="text-sm text-fg"><span className="font-medium">{h.krText}</span> <span className="text-fg-muted num">{h.from} % → {h.to} %</span></p>
                    {h.comment && <p className="mt-[0.2em] text-sm text-fg-secondary">« {h.comment} »</p>}
                    <p className="mt-[0.2em] text-xs text-fg-muted">{a ? fullName(a) : "—"} · {dateLong(h.at)}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </Drawer>
  );
}
