"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, Undo2 } from "lucide-react";
import { BarList, Badge, Button, Card, CardHeader, DataTable, Modal, Segmented, SelectInput, TextArea } from "@/components/ui";
import { amount, fullName, int, money } from "@/lib/format";
import { PREFLIGHT_ORDER, PREFLIGHT_RULES, VARIANCE_THRESHOLD, preflightSummary } from "@/lib/payroll-run";
import { cn } from "@/lib/utils";

const SEV = {
  blocker: { icon: OctagonAlert, tone: "danger", cls: "text-danger", label: "Bloquant", rank: 0 },
  warning: { icon: AlertTriangle, tone: "warning", cls: "text-warning", label: "Avertissement", rank: 1 },
  info: { icon: Info, tone: "info", cls: "text-info", label: "Information", rank: 2 },
};
const MOTIFS = ["Vérifié avec le salarié", "Régularisation prévue le mois prochain", "Écart attendu, validé par la direction", "Dossier en cours de mise à jour", "Autre (préciser)"];

function IgnoreModal({ issue, employee, onClose, onSubmit }) {
  const [motif, setMotif] = useState(MOTIFS[0]);
  const [note, setNote] = useState("");
  const other = motif.startsWith("Autre");
  const valid = !other || note.trim().length >= 3;
  return (
    <Modal
      open={!!issue}
      onClose={onClose}
      title="Ignorer avec motif"
      description={issue ? `${issue.title} · ${fullName(employee)}` : undefined}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button disabled={!valid} onClick={() => onSubmit(other ? note.trim() : note.trim() ? `${motif} — ${note.trim()}` : motif)}>Ignorer ce point</Button>
        </>
      }
    >
      <div className="flex flex-col gap-[1em]">
        <SelectInput label="Motif" value={motif} onChange={setMotif} options={MOTIFS} />
        <TextArea label={other ? "Précisez le motif" : "Commentaire (facultatif)"} required={other} rows={3} value={note} onChange={setNote} />
        <p className="text-xs text-fg-muted">Le motif est enregistré dans le journal d’audit avec votre nom.</p>
      </div>
    </Modal>
  );
}

function IssueRow({ issue, employee, ack, onIgnore, onRestore, readOnly }) {
  const S = SEV[issue.severity];
  return (
    <li className={cn("flex flex-wrap items-center gap-x-[1em] gap-y-[0.5em] px-[1.1em] py-[0.8em]", ack && "opacity-70")}>
      <S.icon className={cn("size-[1.2em] shrink-0", ack ? "text-fg-faint" : S.cls)} aria-hidden />
      <div className="min-w-[14em] flex-1">
        <p className="text-sm font-medium text-fg">
          <Link href={`/app/employees/${employee?.id}`} className="hover:underline">{fullName(employee)}</Link>
          <span className="ms-[0.5em] font-normal text-fg-muted">{employee?.matricule}</span>
        </p>
        <p className="text-sm text-fg-secondary">{issue.title}</p>
        <p className="text-xs text-fg-muted">{ack ? `Ignoré : ${ack.motif}` : issue.detail}</p>
      </div>
      {!readOnly && (
        <div className="flex shrink-0 gap-[0.4em]">
          {ack ? (
            <Button size="sm" variant="ghost" icon={Undo2} onClick={onRestore}>Rétablir</Button>
          ) : (
            <>
              {issue.fix && <Button size="sm" variant="soft" href={issue.fix.href}>{issue.fix.label}</Button>}
              <Button size="sm" variant="ghost" onClick={onIgnore}>Ignorer avec motif</Button>
            </>
          )}
        </div>
      )}
    </li>
  );
}

function RuleBlock({ rule, issues, acks, empById, onIgnore, onRestore, readOnly }) {
  const meta = PREFLIGHT_RULES[rule];
  const S = SEV[meta.severity];
  const open = issues.filter((i) => !acks[i.id]).length;
  return (
    <details open={meta.severity === "blocker" && open > 0} className="group rounded-lg border border-border bg-surface shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-[0.8em] rounded-lg px-[1.1em] py-[0.85em] hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
        <Badge tone={open ? S.tone : "success"} icon={open ? S.icon : CheckCircle2}>{open ? S.label : "Résolu"}</Badge>
        <span className="flex-1 text-sm font-medium text-fg">{meta.label}</span>
        <span className="text-sm text-fg-muted num">{issues.length} salarié{issues.length > 1 ? "s" : ""}</span>
      </summary>
      <div className="border-t border-border-subtle">
        <p className="px-[1.1em] pt-[0.7em] text-xs text-fg-muted">{meta.help}</p>
        <ul className="divide-y divide-border-subtle">
          {issues.map((i) => (
            <IssueRow key={i.id} issue={i} employee={empById[i.employeeId]} ack={acks[i.id]} readOnly={readOnly} onIgnore={() => onIgnore(i)} onRestore={() => onRestore(i)} />
          ))}
        </ul>
      </div>
    </details>
  );
}

function breakdown(diff, model) {
  const sum = (code) => diff.reduce((s, d) => s + d.reasons.filter((r) => r.code === code).reduce((x, r) => x + Math.abs(r.amount ?? 0), 0), 0);
  let absence = 0;
  for (const l of model.lines) {
    if (!l.absenceDays) continue;
    const e = model.empById[l.employeeId];
    const monthly = e.baseSalary + (e.components ?? []).reduce((s, c) => s + c.amount, 0);
    absence += (monthly * l.absenceDays) / l.contractualDays;
  }
  const items = [
    { label: "Entrées (nets ajoutés)", value: diff.filter((d) => d.kind === "entree").reduce((s, d) => s + d.netCur, 0), color: "var(--chart-1)" },
    { label: "Primes", value: sum("prime"), color: "var(--chart-3)" },
    { label: "Heures supplémentaires", value: sum("overtime"), color: "var(--chart-4)" },
    { label: "Absences non payées (brut)", value: absence, color: "var(--chart-7)" },
    { label: "Sorties (nets retirés)", value: diff.filter((d) => d.kind === "sortie").reduce((s, d) => s + d.netPrev, 0), color: "var(--chart-8)" },
  ];
  return items.filter((i) => i.value > 0.5);
}

export default function StepPreflight({ view, update, model, user, readOnly }) {
  const acks = view.acks ?? {};
  const { issues, byRule } = model.preflight;
  const [target, setTarget] = useState(null);
  const [filter, setFilter] = useState("ecarts");
  const sum = preflightSummary(issues, acks);

  const groups = useMemo(() => {
    const withIssues = PREFLIGHT_ORDER.filter((r) => byRule[r].length).sort((a, b) => SEV[PREFLIGHT_RULES[a].severity].rank - SEV[PREFLIGHT_RULES[b].severity].rank);
    const clean = PREFLIGHT_ORDER.filter((r) => !byRule[r].length);
    return { withIssues, clean };
  }, [byRule]);

  const ignore = (motif) => {
    update({ acks: { ...acks, [target.id]: { motif, by: user.employeeId, at: "2026-10-27" } } });
    setTarget(null);
  };
  const restore = (issue) => {
    const next = { ...acks };
    delete next[issue.id];
    update({ acks: next });
  };

  const diffRows = useMemo(() => {
    const rows = model.diff.map((d) => ({ ...d, id: d.employeeId }));
    return filter === "ecarts" ? rows.filter((r) => r.kind !== "stable") : rows;
  }, [model.diff, filter]);
  const bars = useMemo(() => breakdown(model.diff, model), [model]);
  const totPrev = model.diff.reduce((s, d) => s + d.netPrev, 0);
  const totCur = model.diff.reduce((s, d) => s + d.netCur, 0);
  const changed = model.diff.filter((d) => d.kind !== "stable").length;

  const columns = [
    {
      key: "name",
      header: "Salarié",
      sortValue: (r) => fullName(model.empById[r.employeeId]),
      cell: (r) => (
        <span className="relative block ps-[0.2em]">
          {r.kind !== "stable" && <span aria-hidden className="absolute -inset-y-[0.7em] -start-[1.25em] w-[3px] bg-pine-500" />}
          <Link href={`/app/employees/${r.employeeId}`} className="font-medium text-fg hover:underline">{fullName(model.empById[r.employeeId])}</Link>
          <span className="block text-xs text-fg-muted">{model.empById[r.employeeId]?.matricule}</span>
        </span>
      ),
    },
    { key: "netPrev", header: "Net précédent", align: "end", sortValue: (r) => r.netPrev, cell: (r) => (r.kind === "entree" ? <span className="text-fg-muted">—</span> : amount(r.netPrev)) },
    { key: "netCur", header: "Net du mois", align: "end", sortValue: (r) => r.netCur, cell: (r) => (r.kind === "sortie" ? <span className="text-fg-muted">—</span> : <span className="font-medium">{amount(r.netCur)}</span>) },
    { key: "delta", header: "Écart (DA)", align: "end", sortValue: (r) => Math.abs(r.delta), cell: (r) => (r.delta === 0 ? "—" : `${r.delta > 0 ? "+" : "−"}${amount(Math.abs(r.delta))}`) },
    {
      key: "pct",
      header: "Écart %",
      align: "end",
      sortValue: (r) => Math.abs(r.pct ?? 0),
      cell: (r) => (r.pct == null ? <span className="text-fg-muted">—</span> : Math.abs(r.pct) > VARIANCE_THRESHOLD ? <Badge tone="warning">{r.pct > 0 ? "+" : "−"}{Math.abs(r.pct).toFixed(1).replace(".", ",")} %</Badge> : `${r.pct > 0 ? "+" : r.pct < 0 ? "−" : ""}${Math.abs(r.pct).toFixed(1).replace(".", ",")} %`),
    },
    { key: "why", header: "Pourquoi", sortable: false, cell: (r) => (r.reasons.length ? <span className="text-sm text-fg-secondary">{r.reasons.map((x) => x.label).join(" · ")}</span> : <span className="text-fg-muted">Aucun changement</span>) },
  ];

  const prevLabel = model.prevRun ? `la paie précédente` : "";

  return (
    <div className="flex flex-col gap-[1.5em]">
      <section aria-labelledby="pf-title">
        <div className="mb-[0.8em] flex flex-wrap items-center justify-between gap-[0.8em]">
          <h3 id="pf-title" className="text-h3 font-semibold text-fg">Contrôles préalables</h3>
          <div className="flex flex-wrap gap-[0.5em]">
            <Badge tone={sum.blockers ? "danger" : "success"}>{sum.blockers} bloquant{sum.blockers > 1 ? "s" : ""}</Badge>
            <Badge tone={sum.warnings ? "warning" : "neutral"}>{sum.warnings} avertissement{sum.warnings > 1 ? "s" : ""}</Badge>
            <Badge tone="info">{sum.infos} information{sum.infos > 1 ? "s" : ""}</Badge>
            {sum.ignored > 0 && <Badge tone="neutral">{sum.ignored} ignoré{sum.ignored > 1 ? "s" : ""}</Badge>}
          </div>
        </div>
        {sum.blockers > 0 && (
          <p role="status" className="mb-[0.8em] rounded-md bg-danger-bg px-[1em] py-[0.7em] text-sm text-danger-fg">
            {sum.blockers} point{sum.blockers > 1 ? "s" : ""} bloquant{sum.blockers > 1 ? "s" : ""} : corrigez le dossier du salarié, ou ignorez avec un motif, pour continuer.
          </p>
        )}
        <div className="flex flex-col gap-[0.6em]">
          {groups.withIssues.map((rule) => (
            <RuleBlock key={rule} rule={rule} issues={byRule[rule]} acks={acks} empById={model.empById} onIgnore={setTarget} onRestore={restore} readOnly={readOnly} />
          ))}
        </div>
        {groups.clean.length > 0 && (
          <details className="mt-[0.8em] rounded-lg border border-border-subtle bg-surface-2">
            <summary className="cursor-pointer list-none px-[1.1em] py-[0.7em] text-sm text-fg-secondary [&::-webkit-details-marker]:hidden">
              <CheckCircle2 className="me-[0.5em] inline size-[1.1em] text-success" aria-hidden />
              {groups.clean.length} contrôles réussis
            </summary>
            <ul className="grid gap-[0.4em] px-[1.1em] pb-[0.9em] text-sm text-fg-muted sm:grid-cols-2">
              {groups.clean.map((r) => <li key={r} className="flex items-center gap-[0.5em]"><CheckCircle2 className="size-[1em] text-success" aria-hidden />{PREFLIGHT_RULES[r].label}</li>)}
            </ul>
          </details>
        )}
      </section>

      <section id="ecarts" aria-labelledby="diff-title" className="scroll-mt-[1em]">
        <div className="mb-[0.8em] flex flex-wrap items-end justify-between gap-[0.8em]">
          <div>
            <h3 id="diff-title" className="text-h3 font-semibold text-fg">Écarts vs {prevLabel || "le mois précédent"}</h3>
            <p className="text-sm text-fg-muted">
              {model.prevRun ? `${changed} salarié${changed > 1 ? "s" : ""} avec un écart · net total ${totCur >= totPrev ? "+" : "−"}${amount(Math.abs(totCur - totPrev), { decimals: 0 })} DA (${totPrev ? ((totCur - totPrev) / totPrev * 100).toFixed(1).replace(".", ",") : "0"} %)` : "Aucune paie précédente à comparer."}
            </p>
          </div>
          <Segmented value={filter} onChange={setFilter} options={[{ value: "ecarts", label: `Écarts (${changed})` }, { value: "all", label: "Tous" }]} />
        </div>
        <div className="grid gap-[1em] xl:grid-cols-[1fr_20em]">
          <DataTable
            columns={columns}
            rows={diffRows}
            defaultSort={{ key: "delta", dir: "desc" }}
            pageSize={10}
            footerRow={{ name: "Total", netPrev: amount(totPrev), netCur: amount(totCur), delta: `${totCur - totPrev >= 0 ? "+" : "−"}${amount(Math.abs(totCur - totPrev))}` }}
          />
          <Card className="h-fit">
            <CardHeader title="D'où viennent les écarts" description="Montants en DA, tous salariés" />
            {bars.length ? <BarList items={bars} format={(v) => amount(v, { decimals: 0 })} /> : <p className="text-sm text-fg-muted">Aucun écart à expliquer.</p>}
            <p className="mt-[1em] text-xs text-fg-muted">Seuil d’alerte : {VARIANCE_THRESHOLD} % du net. {int(model.lines.length)} bulletins comparés, {money(totCur, { decimals: 0 })} de net au total.</p>
          </Card>
        </div>
      </section>

      <IgnoreModal key={target?.id ?? "none"} issue={target} employee={target ? model.empById[target.employeeId] : null} onClose={() => setTarget(null)} onSubmit={ignore} />
    </div>
  );
}
