"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Download, FileCheck2, FileSpreadsheet, Info } from "lucide-react";
import { Badge, Button, Card, DataTable, EmptyState, Modal, PageHeader, StatusBadge, Tabs, TextInput, Stamp } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { downloadCsv } from "@/components/app/_kit/csv";
import { CURRENT_PERIOD, TODAY } from "@/lib/clock";
import { db, useCollection } from "@/lib/db";
import { amount, date, dateLong, int, periodLabel } from "@/lib/format";
import { diffDays } from "@/lib/dates";
import { DECLARATION_KINDS, declarationRows } from "@/lib/payroll-run";
import { draftId } from "./drafts";
import { useDrafts, useEmployeesById, usePayrollModel, usePayrollRuns } from "./hooks";
import { periodTitle } from "./utils";

const FILE_STATUS = { filed: { label: "Déposée", tone: "success" }, todo: { label: "À déposer", tone: "warning" }, late: { label: "En retard", tone: "danger" } };
const kindOrder = ["G50", "CNAS", "G29", "DAS"];
const scopeLabel = (d) => (d.period.length === 4 ? `Exercice ${d.period}` : periodTitle(d.period));
const statusOf = (d) => (d.status === "filed" ? "filed" : d.dueDate < TODAY ? "late" : "todo");

function FileModal({ decl, onClose, onFiled }) {
  const [ref, setRef] = useState("");
  const [at, setAt] = useState(TODAY);
  const [done, setDone] = useState(false);
  const valid = ref.trim().length >= 3 && at;
  return (
    <Modal
      open={!!decl}
      onClose={onClose}
      size="sm"
      title={done ? "Déclaration déposée" : "Marquer comme déposée"}
      description={decl ? `${DECLARATION_KINDS[decl.kind].label} · ${scopeLabel(decl)}` : undefined}
      footer={
        done ? (
          <Button onClick={onClose}>Fermer</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button disabled={!valid} icon={FileCheck2} onClick={() => { onFiled(decl, ref.trim(), at); setDone(true); }}>Confirmer le dépôt</Button>
          </>
        )
      }
    >
      {done ? (
        <div className="flex flex-col items-center gap-[0.8em] py-[0.5em] text-center">
          <Stamp label="DÉPOSÉ" sub={decl ? DECLARATION_KINDS[decl.kind].label.toUpperCase() : ""} />
          <p className="text-sm text-fg-secondary">Référence <span className="font-mono">{ref}</span>, déposée le {date(at)}.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-[1em]">
          <TextInput label="Référence de dépôt" required value={ref} onChange={setRef} placeholder="Ex. G50-2026-10-0521" hint="Numéro reçu du portail Jibayatic ou de la CNAS." autoComplete="off" />
          <TextInput label="Date de dépôt" type="date" value={at} onChange={setAt} />
          <p className="text-xs text-fg-muted">Ce marquage est local à la démo : aucun dépôt réel n’est effectué.</p>
        </div>
      )}
    </Modal>
  );
}

function Body({ user }) {
  const declarations = useCollection("declarations");
  const runs = usePayrollRuns();
  const empById = useEmployeesById();
  const drafts = useDrafts();
  const draft = drafts.find((d) => d.id === draftId(CURRENT_PERIOD));
  const model = usePayrollModel({ period: CURRENT_PERIOD, scope: draft?.scope ?? null, edits: draft?.edits });
  const [kind, setKind] = useState("all");
  const [selId, setSelId] = useState("dc-g50-2026-10");
  const [filing, setFiling] = useState(null);

  const list = useMemo(
    () => [...declarations].filter((d) => kind === "all" || d.kind === kind).sort((a, b) => (a.status === b.status ? a.dueDate.localeCompare(b.dueDate) : a.status === "filed" ? 1 : -1) || kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind)),
    [declarations, kind],
  );
  const selected = declarations.find((d) => d.id === selId) ?? declarations[0];

  const summary = useMemo(() => {
    if (!selected) return null;
    const hasRun = runs.some((r) => r.period === selected.period);
    const provisional = !hasRun && selected.period === CURRENT_PERIOD && DECLARATION_KINDS[selected.kind].cadence === "mensuelle";
    const source = provisional ? [...runs, { id: "prov", period: CURRENT_PERIOD, status: "validated", lines: model.lines }] : runs;
    return { ...declarationRows(selected.kind, selected.period, source, empById), provisional };
  }, [selected, runs, empById, model.lines]);

  const onFiled = (decl, reference, at) => {
    db.patch("declarations", decl.id, { status: "filed", reference, filedAt: at });
    db.audit(user.employeeId, "Déclaration déposée", `${DECLARATION_KINDS[decl.kind].label} · ${scopeLabel(decl)}`, `Référence ${reference}`);
    if (DECLARATION_KINDS[decl.kind].cadence === "mensuelle") {
      const other = declarations.find((d) => d.id !== decl.id && d.period === decl.period && ["G50", "CNAS"].includes(d.kind) && d.kind !== decl.kind);
      const run = runs.find((r) => r.period === decl.period && r.status === "paid");
      if (other?.status === "filed" && run) db.patch("payrollRuns", run.id, { status: "declared", declaredAt: at });
    }
  };

  const columns = [
    { key: "name", header: "Salarié", sortValue: (r) => r.name, cell: (r) => <span><span className="font-medium text-fg">{r.name}</span><span className="block text-xs text-fg-muted">{r.matricule}</span></span> },
    { key: "nin", header: "NIN", sortValue: (r) => r.nin, cell: (r) => (r.nin ? <span className="font-mono text-xs">{r.nin}</span> : <Badge tone="danger">Manquant</Badge>) },
    { key: "gross", header: "Brut", align: "end", sortValue: (r) => r.gross, cell: (r) => amount(r.gross) },
    { key: "cotisable", header: "Cotisable", align: "end", sortValue: (r) => r.cotisable, cell: (r) => amount(r.cotisable) },
    { key: "cnasEmployee", header: "CNAS", align: "end", sortValue: (r) => r.cnasEmployee, cell: (r) => amount(r.cnasEmployee) },
    { key: "taxable", header: "Imposable", align: "end", sortValue: (r) => r.taxable, cell: (r) => amount(r.taxable) },
    { key: "irg", header: "IRG", align: "end", sortValue: (r) => r.irg, cell: (r) => amount(r.irg) },
  ];

  const csv = () => {
    const rows = [...summary.rows, { name: "TOTAL", matricule: "", nin: "", ...summary.totals }];
    downloadCsv(`${selected.kind.toLowerCase()}-${selected.period}-demo.csv`, rows, [
      { key: "matricule", header: "Matricule" }, { key: "name", header: "Salarié" }, { key: "nin", header: "NIN" },
      ...["gross", "cotisable", "cnasEmployee", "taxable", "irg"].map((k, i) => ({ key: k, header: ["Brut", "Cotisable", "CNAS", "Imposable", "IRG"][i], value: (r) => String(r[k]).replace(".", ",") })),
    ]);
  };

  const counts = { all: declarations.length };
  for (const d of declarations) counts[d.kind] = (counts[d.kind] ?? 0) + 1;

  return (
    <>
      <PageHeader
        eyebrow="Paie"
        title="Déclarations"
        description="G50, CNAS, G29 / 301 bis et DAS : suivez les échéances, générez le récapitulatif depuis vos paies validées et notez la référence de dépôt."
        actions={<Badge tone="info" icon={Info}>Format démo, non officiel</Badge>}
      />

      <Tabs
        className="mb-[1.25em]"
        value={kind}
        onChange={setKind}
        tabs={[{ value: "all", label: "Toutes", count: counts.all }, ...kindOrder.map((k) => ({ value: k, label: DECLARATION_KINDS[k].label, count: counts[k] ?? 0 }))]}
      />

      {list.length === 0 ? (
        <Card padded={false}><EmptyState icon={FileCheck2} title="Aucune déclaration" description="Les échéances apparaissent dès la première paie validée." /></Card>
      ) : (
        <div className="grid gap-[1em] md:grid-cols-2 xl:grid-cols-3">
          {list.map((d) => {
            const st = statusOf(d);
            const left = diffDays(TODAY, d.dueDate);
            const isSel = selected?.id === d.id;
            return (
              <Card key={d.id} className={`flex flex-col gap-[0.9em] !p-[1.25em] ${isSel ? "ring-2 ring-primary" : ""}`}>
                <div className="flex items-start justify-between gap-[1em]">
                  <div className="min-w-0">
                    <h3 className="text-h3 font-semibold text-fg">{DECLARATION_KINDS[d.kind].label}</h3>
                    <p className="text-sm text-fg-muted">{scopeLabel(d)}</p>
                  </div>
                  <StatusBadge status={st} map={FILE_STATUS} />
                </div>
                <p className="text-sm text-fg-secondary">{DECLARATION_KINDS[d.kind].long}</p>
                <p className="flex items-center gap-[0.5em] text-sm text-fg-secondary"><CalendarClock className="size-[1.1em] text-fg-muted" aria-hidden />
                  {d.status === "filed" ? `Déposée le ${date(d.filedAt ?? d.dueDate)} · réf. ` : `Avant le ${dateLong(d.dueDate)}`}
                  {d.status === "filed" ? <span className="font-mono text-xs">{d.reference}</span> : <span className={left < 0 ? "text-danger-fg" : "text-fg-muted"}>({left < 0 ? `${-left} j de retard` : `J-${left}`})</span>}
                </p>
                <p className="text-xs text-fg-muted">{DECLARATION_KINDS[d.kind].note}</p>
                <div className="mt-auto flex flex-wrap gap-[0.5em] pt-[0.3em]">
                  <Button size="sm" variant={isSel ? "soft" : "secondary"} icon={FileSpreadsheet} onClick={() => setSelId(d.id)} aria-pressed={isSel}>Récapitulatif</Button>
                  {d.status !== "filed" && <Button size="sm" icon={FileCheck2} onClick={() => setFiling(d)}>Marquer comme déposée</Button>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selected && summary && (
        <section aria-labelledby="sum-title" className="mt-[2em]">
          <div className="mb-[0.8em] flex flex-wrap items-end justify-between gap-[0.8em]">
            <div>
              <h2 id="sum-title" className="text-h3 font-semibold text-fg">Récapitulatif {DECLARATION_KINDS[selected.kind].label} · {scopeLabel(selected)}</h2>
              <p className="text-sm text-fg-muted">
                {summary.rows.length ? `${int(summary.rows.length)} salariés${DECLARATION_KINDS[selected.kind].cadence === "annuelle" ? `, cumul de ${summary.runCount} paie${summary.runCount > 1 ? "s" : ""} validée${summary.runCount > 1 ? "s" : ""}` : ""}. Format démo, non officiel.` : "Aucune donnée pour cette période."}
              </p>
            </div>
            <Button variant="secondary" icon={Download} disabled={!summary.rows.length} onClick={csv}>Télécharger le CSV</Button>
          </div>
          {summary.provisional && <p role="status" className="mb-[0.8em] rounded-md bg-warning-bg px-[1em] py-[0.7em] text-sm text-warning-fg">Aperçu provisoire : la paie de {periodLabel(CURRENT_PERIOD)} n’est pas encore validée, les montants peuvent encore changer.</p>}
          {DECLARATION_KINDS[selected.kind].cadence === "annuelle" && summary.rows.length > 0 && <p className="mb-[0.8em] rounded-md bg-info-bg px-[1em] py-[0.7em] text-sm text-info-fg">Les paies de janvier à mars 2026 ne sont pas présentes dans cette démo : le cumul annuel est partiel.</p>}
          <DataTable
            columns={columns}
            rows={summary.rows.map((r) => ({ ...r, id: r.employeeId }))}
            pageSize={12}
            footerRow={{ name: "Total", gross: amount(summary.totals.gross), cotisable: amount(summary.totals.cotisable), cnasEmployee: amount(summary.totals.cnasEmployee), taxable: amount(summary.totals.taxable), irg: amount(summary.totals.irg) }}
            empty={<EmptyState icon={FileSpreadsheet} title="Récapitulatif indisponible" description="Il sera généré dès que la paie de cette période sera validée." action={<Button href="/app/payroll/runs/new">Lancer la paie</Button>} />}
          />
        </section>
      )}

      <FileModal key={filing?.id ?? "none"} decl={filing} onClose={() => setFiling(null)} onFiled={onFiled} />
    </>
  );
}

export default function Declarations() {
  return <AccessGate roles={["admin", "hr", "accountant"]}>{(user) => <Body user={user} />}</AccessGate>;
}
