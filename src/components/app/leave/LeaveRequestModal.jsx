"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ShieldCheck } from "lucide-react";
import { Badge, Button, Modal, SelectInput, TextArea, TextInput } from "@/components/ui";
import { LEAVE_TYPES } from "@/data/constants";
import { TODAY } from "@/lib/clock";
import { db, newId } from "@/lib/db";
import { date, dateShort, fullName } from "@/lib/format";
import { useCurrentUser } from "@/lib/use-current-user";
import { cn } from "@/lib/utils";
import FileDrop from "./FileDrop";
import { BalanceImpact, IssueList, useLeaveAnalysis } from "./LeaveContext";
import { COVER, PAY_IMPACT, coverOf, fmtDays, payImpactOf, proofRequired } from "./leave-utils";
import { useDirectory } from "./use-directory";

/** Request flow: type, dates with live working-day count, balance impact, reason, proof upload (mock). */
export default function LeaveRequestModal({ open, onClose, allowPick = false, onCreated }) {
  const me = useCurrentUser();
  const dir = useDirectory();
  const [employeeId, setEmployeeId] = useState(null);
  const [type, setType] = useState("annual");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState(null);
  const [touched, setTouched] = useState(false);

  const targetId = allowPick && employeeId ? employeeId : me.employeeId;
  const a = useLeaveAnalysis({ employeeId: targetId, type, from, to });
  const policies = a?.policies;

  const typeOptions = useMemo(
    () => Object.entries(LEAVE_TYPES).filter(([k]) => policies?.types[k]?.enabled !== false).map(([value, t]) => ({ value, label: t.label })),
    [policies],
  );
  const employeeOptions = useMemo(
    () => dir.employees.filter((e) => e.status !== "sorti").map((e) => ({ value: e.id, label: `${fullName(e)} · ${e.matricule}` })),
    [dir.employees],
  );

  const needProof = policies ? proofRequired(type, a.count.working, policies) : false;
  const errors = {};
  if (!from) errors.from = "Choisissez la date de début.";
  if (!to) errors.to = "Choisissez la date de fin.";
  else if (from && to < from) errors.to = "La fin doit suivre le début.";
  else if (a && from && a.count.working === 0) errors.to = "Aucun jour ouvré sur cette période.";
  if (a?.overlaps.length) errors.overlap = "Cette période chevauche une demande existante : modifiez les dates.";
  if (needProof && !file) errors.file = "Justificatif obligatoire pour ce type de congé.";
  const blocked = Object.keys(errors).length > 0;

  const chain = useMemo(() => {
    if (!a) return [];
    const manager = dir.byId[a.emp.managerId];
    const hr = dir.employees.find((e) => e.role === "hr");
    const rule = policies.types[type]?.approval ?? "Manager puis RH";
    return [rule.includes("Manager") && manager, rule.includes("RH") && hr].filter(Boolean).filter((e, i, l) => l.findIndex((x) => x.id === e.id) === i);
  }, [a, dir, policies, type]);

  const reset = () => { setEmployeeId(null); setType("annual"); setFrom(""); setTo(""); setReason(""); setFile(null); setTouched(false); };
  const close = () => { reset(); onClose(); };

  const submit = () => {
    setTouched(true);
    if (blocked || !a) return;
    const request = {
      id: newId("lv"), employeeId: a.emp.id, type, from, to, days: a.count.working, status: "pending",
      reason: reason.trim(), proof: file?.name ?? null, createdAt: TODAY, decidedBy: null, decidedAt: null,
    };
    db.insert("leaveRequests", request, { prepend: true });
    db.audit(me.employeeId, "Congé demandé", fullName(a.emp), `${LEAVE_TYPES[type].label} · ${dateShort(from)} → ${dateShort(to)} (${a.count.working} j)`);
    db.notify({ title: "Nouvelle demande de congé", body: `${fullName(a.emp)} · ${LEAVE_TYPES[type].label}, ${dateShort(from)} → ${dateShort(to)}`, href: "/app/inbox", roles: ["admin", "hr", "manager"] });
    onCreated?.(request);
    close();
  };

  const cover = COVER[coverOf(type, policies ?? { types: {} })];
  const impact = PAY_IMPACT[payImpactOf(type, policies ?? { types: {} })];

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Poser un congé"
      description="Les week-ends (vendredi, samedi) et jours fériés ne sont pas décomptés."
      footer={
        <>
          <Button variant="ghost" onClick={close}>Annuler</Button>
          <Button icon={CalendarDays} onClick={submit}>Envoyer la demande</Button>
        </>
      }
    >
      <div className="grid gap-[1.5em] md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="flex flex-col gap-[1em]">
          {allowPick && <SelectInput label="Salarié" value={targetId} onChange={setEmployeeId} options={employeeOptions} />}
          <SelectInput label="Type de congé" value={type} onChange={setType} options={typeOptions} />
          <div className="grid grid-cols-2 gap-[0.75em]">
            <TextInput label="Du" type="date" required value={from} onChange={(v) => { setFrom(v); if (!to || to < v) setTo(v); }} error={touched ? errors.from : undefined} />
            <TextInput label="Au" type="date" required min={from || undefined} value={to} onChange={setTo} error={touched ? errors.to : undefined} />
          </div>
          {touched && errors.overlap && <p role="alert" className="text-[0.8125em] text-danger-fg">{errors.overlap}</p>}
          <TextArea label="Motif" rows={3} value={reason} onChange={setReason} placeholder="Ex. : voyage familial à Tlemcen." hint="Facultatif, visible par votre responsable." />
          <div>
            <p className="mb-[0.4em] text-[0.8125em] font-medium text-fg-secondary">
              Justificatif {needProof ? <span className="font-normal text-fg-muted">(obligatoire)</span> : <span className="font-normal text-fg-muted">(facultatif)</span>}
            </p>
            <FileDrop
              value={file}
              onChange={setFile}
              accept=".pdf,.jpg,.jpeg,.png"
              label="Choisir un fichier"
              hint={type === "sick" ? "Certificat médical, PDF ou photo. Requis au-delà d'1 jour." : "PDF, JPG ou PNG, 5 Mo maximum."}
              error={touched && !!errors.file}
            />
            {touched && errors.file && <p role="alert" className="mt-[0.4em] text-[0.8125em] text-danger-fg">{errors.file}</p>}
          </div>
        </div>

        <aside aria-live="polite" className="flex flex-col gap-[1em] rounded-lg border border-border bg-surface-2 p-[1.1em]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Récapitulatif</p>
            <p className="mt-[0.3em] font-display text-kpi font-semibold text-fg num">
              {from && to && to >= from ? a?.count.working ?? 0 : "—"}
              <span className="ms-[0.3em] text-base font-medium text-fg-secondary">jour{(a?.count.working ?? 0) > 1 ? "s" : ""} ouvré{(a?.count.working ?? 0) > 1 ? "s" : ""}</span>
            </p>
            {from && to && to >= from ? (
              <p className="mt-[0.2em] text-sm text-fg-muted">
                {date(from)} <ArrowRight className="inline size-[1em]" aria-hidden /> {date(to)} · {a.count.calendar} j calendaires
                {a.count.weekend > 0 && `, dont ${a.count.weekend} de week-end`}
              </p>
            ) : (
              <p className="mt-[0.2em] text-sm text-fg-muted">Choisissez vos dates pour voir le décompte.</p>
            )}
          </div>

          {a?.count.holidays.length > 0 && (
            <ul className="flex flex-col gap-[0.3em] text-sm text-fg-secondary">
              {a.count.holidays.map((h) => (
                <li key={h.date} className="flex flex-wrap items-center gap-[0.5em]"><Badge tone="neutral">Férié</Badge>{h.label} <span className="num text-xs text-fg-muted">{dateShort(h.date)}</span></li>
              ))}
            </ul>
          )}

          {a && (
            <div className="border-t border-border-subtle pt-[0.9em]">
              <p className="mb-[0.4em] text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Impact sur le solde</p>
              <BalanceImpact before={a.before} after={a.after} consumes={a.consumes} />
            </div>
          )}

          <div className="flex flex-wrap gap-[0.5em] border-t border-border-subtle pt-[0.9em] text-sm">
            <span className="text-fg-muted">Pris en charge par</span> <Badge tone={cover.tone}>{cover.label}</Badge>
            <span className="text-fg-muted">Impact paie</span> <Badge tone={impact.tone}>{impact.label}</Badge>
          </div>

          {a && (from && to) ? <IssueList issues={a.issues.filter((i) => i.tone !== "danger" || i.text.indexOf("Aucun jour") < 0)} /> : null}

          {chain.length > 0 && (
            <p className="flex flex-wrap items-center gap-[0.4em] border-t border-border-subtle pt-[0.9em] text-sm text-fg-secondary">
              <ShieldCheck className="size-[1.15em] text-pine-600" aria-hidden />
              Validation :
              {chain.map((c, i) => (
                <span key={c.id} className={cn("inline-flex items-center gap-[0.4em]")}>
                  {i > 0 && <span className="text-fg-muted">puis</span>}
                  <strong className="font-medium text-fg">{c.firstName} {c.lastName}</strong>
                </span>
              ))}
            </p>
          )}
        </aside>
      </div>
    </Modal>
  );
}
