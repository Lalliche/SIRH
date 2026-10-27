"use client";

import { useState } from "react";
import { CheckCircle2, CircleDashed, Hourglass, Lock, Send, ShieldCheck } from "lucide-react";
import { Button, Card, CardHeader, Checkbox, DataTable, Modal, PersonCell } from "@/components/ui";
import { amount, fullName, int, money } from "@/lib/format";
import { preflightSummary } from "@/lib/payroll-run";
import { ROLES } from "@/data/constants";
import { deMois, periodTitle } from "../utils";
import MoneyFlow from "../MoneyFlow";

export default function StepValidate({ view, model, user, isAdmin, onValidate, onSubmit, validating }) {
  const [open, setOpen] = useState(false);
  const [sure, setSure] = useState(false);
  const sum = preflightSummary(model.preflight.issues, view.acks);
  const checks = [
    { ok: model.lines.length > 0, label: `${int(model.lines.length)} bulletins calculés` },
    { ok: sum.blockers === 0, label: sum.blockers ? `${sum.blockers} point(s) bloquant(s) non résolu(s)` : "Aucun point bloquant" },
    { ok: true, label: `${sum.warnings} avertissement(s) restant(s), ${sum.ignored} ignoré(s) avec motif`, soft: sum.warnings > 0 },
    { ok: !!view.calcDone, label: "Calcul à jour avec les dernières variables" },
  ];
  const canValidate = sum.blockers === 0 && view.calcDone && model.lines.length > 0;
  const t = model.totals;

  const columns = [
    { key: "name", header: "Salarié", sortValue: (r) => fullName(r.employee), cell: (r) => <PersonCell employee={r.employee} sub={r.employee.matricule} /> },
    { key: "gross", header: "Brut", align: "end", sortValue: (r) => r.gross, cell: (r) => amount(r.gross) },
    { key: "cnasEmployee", header: "CNAS salarié", align: "end", sortValue: (r) => r.cnasEmployee, cell: (r) => <span className="text-fg-secondary">−{amount(r.cnasEmployee)}</span> },
    { key: "irg", header: "IRG", align: "end", sortValue: (r) => r.irg, cell: (r) => <span className="text-fg-secondary">−{amount(r.irg)}</span> },
    { key: "retenues", header: "Retenues", align: "end", sortValue: (r) => r.loanDeduction + r.otherDeductions, cell: (r) => (r.loanDeduction + r.otherDeductions ? <span className="text-fg-secondary">−{amount(r.loanDeduction + r.otherDeductions)}</span> : "—") },
    { key: "net", header: "Net à payer", align: "end", sortValue: (r) => r.net, cell: (r) => <span className="font-medium">{amount(r.net)}</span> },
    { key: "employerCost", header: "Coût employeur", align: "end", sortValue: (r) => r.employerCost, cell: (r) => amount(r.employerCost) },
  ];
  const rows = model.lines.map((l) => ({ ...l, id: l.employeeId, employee: model.empById[l.employeeId] }));

  return (
    <div className="grid items-start gap-[1.25em] xl:grid-cols-[1fr_21em]">
      <div className="flex min-w-0 flex-col gap-[1.25em]">
        <Card className="border-t-2 border-t-primary">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Net à payer · {periodTitle(view.period)}</p>
          <p className="mt-[0.3em] font-display text-[2.6em] font-semibold leading-none text-fg"><MoneyFlow value={t.net} decimals={2} /></p>
          <dl className="mt-[1.2em] grid gap-[1em] border-t border-border-subtle pt-[1em] sm:grid-cols-4">
            {[["Masse brute", t.gross], ["CNAS salarié", t.cnasEmployee], ["IRG", t.irg], ["Coût employeur", t.employerCost]].map(([l, v]) => (
              <div key={l}><dt className="text-xs text-fg-muted">{l}</dt><dd className="mt-[0.15em] font-medium text-fg num">{money(v, { decimals: 0 })}</dd></div>
            ))}
          </dl>
        </Card>
        <DataTable
          columns={columns}
          rows={rows}
          pageSize={10}
          defaultSort={{ key: "name", dir: "asc" }}
          footerRow={{ name: `Total · ${int(rows.length)} salariés`, gross: amount(t.gross), cnasEmployee: `−${amount(t.cnasEmployee)}`, irg: `−${amount(t.irg)}`, retenues: `−${amount(t.loanDeduction + t.otherDeductions)}`, net: amount(t.net), employerCost: amount(t.employerCost) }}
        />
      </div>

      <Card className="xl:sticky xl:top-[1em]">
        <CardHeader title="Avant de valider" description="Validation par la direction générale" />
        <ul className="flex flex-col gap-[0.7em] text-sm">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-[0.6em]">
              {c.ok ? <CheckCircle2 className={`mt-[0.1em] size-[1.2em] shrink-0 ${c.soft ? "text-warning" : "text-success"}`} aria-hidden /> : <CircleDashed className="mt-[0.1em] size-[1.2em] shrink-0 text-danger" aria-hidden />}
              <span className="text-fg-secondary">{c.label}</span>
            </li>
          ))}
        </ul>
        <ol className="mt-[1.2em] flex flex-col gap-[0.5em] border-t border-border-subtle pt-[1em] text-sm">
          <li className="flex justify-between"><span className="text-fg-muted">Préparée par</span><span className="font-medium text-fg">{ROLES[user.role]?.short} · {fullName(user.employee)}</span></li>
          <li className="flex justify-between"><span className="text-fg-muted">Validation</span><span className="font-medium text-fg">Directeur général</span></li>
        </ol>

        {isAdmin ? (
          <Button className="mt-[1.2em] w-full" size="lg" icon={ShieldCheck} disabled={!canValidate} onClick={() => { setSure(false); setOpen(true); }}>Valider la paie</Button>
        ) : view.submitted ? (
          <p role="status" className="mt-[1.2em] flex items-start gap-[0.6em] rounded-md bg-info-bg p-[0.8em] text-sm text-info-fg"><Hourglass className="mt-[0.1em] size-[1.2em] shrink-0" aria-hidden />Soumise à la validation du directeur général le {view.submitted.at.split("-").reverse().join("/")}.</p>
        ) : (
          <>
            <Button className="mt-[1.2em] w-full" size="lg" icon={Send} disabled={!canValidate} onClick={onSubmit}>Soumettre à la validation</Button>
            <p className="mt-[0.7em] flex items-start gap-[0.5em] text-xs text-fg-muted"><Lock className="mt-[0.1em] size-[1.1em] shrink-0" aria-hidden />Seul le directeur général peut valider. Il sera notifié.</p>
          </>
        )}
        {isAdmin && !canValidate && <p className="mt-[0.7em] text-xs text-danger-fg">Résolvez les points bloquants à l’étape 4 pour valider.</p>}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Valider la paie ${deMois(view.period)} ?`}
        size="sm"
        description="La validation verrouille les variables et génère les bulletins."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button disabled={!sure} loading={validating} onClick={() => { setOpen(false); onValidate(); }}>Valider et verrouiller</Button>
          </>
        }
      >
        <dl className="grid grid-cols-2 gap-[0.6em] text-sm">
          <dt className="text-fg-muted">Bulletins</dt><dd className="text-end num">{int(model.lines.length)}</dd>
          <dt className="text-fg-muted">Net à payer</dt><dd className="text-end font-medium num">{money(t.net)}</dd>
          <dt className="text-fg-muted">Coût employeur</dt><dd className="text-end num">{money(t.employerCost)}</dd>
        </dl>
        <Checkbox className="mt-[1.2em]" checked={sure} onChange={setSure} label="J'ai relu les écarts et les contrôles préalables." />
      </Modal>
    </div>
  );
}
