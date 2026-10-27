"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Check, Download, ExternalLink, FileX2, Lock, Printer } from "lucide-react";
import { Button, Card, DataTable, Delta, Drawer, EmptyState, KpiCard, Modal, PageHeader, PersonCell, SearchInput, StatusBadge, TextInput } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { downloadCsv } from "@/components/app/_kit/csv";
import { printPage } from "@/components/app/_kit/Print";
import { PayslipDocument } from "@/components/app/payslips/PayslipDocument";
import { PAYROLL_STATUS } from "@/data/constants";
import { TODAY } from "@/lib/clock";
import { db } from "@/lib/db";
import { amount, date, fullName, int, money, periodLabel } from "@/lib/format";
import { prevPeriod, totalsOf } from "@/lib/payroll-run";
import { cn } from "@/lib/utils";
import { useEmployeesById, usePayrollRuns } from "./hooks";
import { pctDelta, periodTitle } from "./utils";

const FLOW = ["draft", "computed", "validated", "paid", "declared", "closed"];
const FLOW_LABEL = { draft: "Brouillon", computed: "Calculée", validated: "Validée", paid: "Payée", declared: "Déclarée", closed: "Clôturée" };

function Timeline({ run }) {
  const rank = FLOW.indexOf(run.status === "error" ? "draft" : run.status);
  const dates = { draft: run.createdAt, computed: run.createdAt, validated: run.validatedAt, paid: run.paidAt, declared: run.declaredAt, closed: run.closedAt };
  return (
    <ol aria-label="Historique des statuts" className="grid grid-cols-3 gap-[0.8em] sm:grid-cols-6">
      {FLOW.map((s, i) => {
        const done = i <= rank;
        return (
          <li key={s} className="flex flex-col items-start gap-[0.35em]">
            <span className={cn("flex size-[1.8em] items-center justify-center rounded-full text-xs font-semibold", done ? "bg-primary text-primary-fg" : "bg-bg-sunken text-fg-muted")}>
              {done ? <Check className="size-[1.1em]" aria-hidden /> : i + 1}
            </span>
            <span className={cn("text-sm", done ? "font-medium text-fg" : "text-fg-muted")}>{FLOW_LABEL[s]}</span>
            <span className="text-xs text-fg-muted">{done && dates[s] ? date(dates[s]) : "À venir"}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Body({ id, user }) {
  const runs = usePayrollRuns();
  const empById = useEmployeesById();
  const run = runs.find((r) => r.id === id);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [closing, setClosing] = useState(false);
  const [typed, setTyped] = useState("");

  const prev = run ? runs.find((r) => r.period === prevPeriod(run.period)) : null;
  const totals = useMemo(() => (run ? { ...totalsOf(run.lines), ...run.totals, fnpos: run.totals.fnpos ?? totalsOf(run.lines).fnpos } : null), [run]);
  const prevTotals = useMemo(() => (prev ? totalsOf(prev.lines) : null), [prev]);
  const rows = useMemo(() => {
    if (!run) return [];
    const needle = q.trim().toLowerCase();
    return run.lines
      .map((l) => ({ ...l, id: l.employeeId, employee: empById[l.employeeId], retenues: (l.loanDeduction ?? 0) + (l.otherDeductions ?? 0) }))
      .filter((r) => r.employee && (!needle || `${fullName(r.employee)} ${r.employee.matricule}`.toLowerCase().includes(needle)));
  }, [run, empById, q]);

  if (!run) {
    return <EmptyState icon={FileX2} title="Paie introuvable" description="Cette paie n'existe pas ou a été supprimée." action={<Button href="/app/payroll">Retour à la paie</Button>} />;
  }
  const locked = run.status === "closed";
  const canClose = user.role === "admin" && ["paid", "declared"].includes(run.status);
  const label = periodTitle(run.period);

  const exportCsv = () =>
    downloadCsv(`paie-${run.period}.csv`, rows, [
      { key: "matricule", header: "Matricule", value: (r) => r.employee.matricule },
      { key: "name", header: "Salarié", value: (r) => fullName(r.employee) },
      { key: "gross", header: "Brut", value: (r) => String(r.gross).replace(".", ",") },
      { key: "cnasEmployee", header: "CNAS salarié", value: (r) => String(r.cnasEmployee).replace(".", ",") },
      { key: "irg", header: "IRG", value: (r) => String(r.irg).replace(".", ",") },
      { key: "retenues", header: "Retenues", value: (r) => String(r.retenues).replace(".", ",") },
      { key: "net", header: "Net à payer", value: (r) => String(r.net).replace(".", ",") },
      { key: "employerCost", header: "Coût employeur", value: (r) => String(r.employerCost).replace(".", ",") },
    ]);

  const close = () => {
    db.patch("payrollRuns", run.id, { status: "closed", closedAt: TODAY });
    db.audit(user.employeeId, "Période clôturée", `Paie ${periodLabel(run.period)}`, "Verrouillage de la période");
    setClosing(false);
    setTyped("");
  };

  const openRow = (r) => setOpen(r);
  const columns = [
    { key: "name", header: "Salarié", sortValue: (r) => fullName(r.employee), cell: (r) => (
      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openRow(r); }} className="!h-auto max-w-full justify-start !px-0 !py-[0.1em] text-start font-normal hover:bg-transparent" aria-label={`Ouvrir le bulletin de ${fullName(r.employee)}`}>
        <PersonCell employee={r.employee} sub={r.employee.matricule} />
      </Button>
    ) },
    { key: "gross", header: "Brut", align: "end", sortValue: (r) => r.gross, cell: (r) => amount(r.gross) },
    { key: "cnasEmployee", header: "CNAS salarié", align: "end", sortValue: (r) => r.cnasEmployee, cell: (r) => <span className="text-fg-secondary">−{amount(r.cnasEmployee)}</span> },
    { key: "irg", header: "IRG", align: "end", sortValue: (r) => r.irg, cell: (r) => <span className="text-fg-secondary">−{amount(r.irg)}</span> },
    { key: "retenues", header: "Retenues", align: "end", sortValue: (r) => r.retenues, cell: (r) => (r.retenues ? <span className="text-fg-secondary">−{amount(r.retenues)}</span> : "—") },
    { key: "net", header: "Net à payer", align: "end", sortValue: (r) => r.net, cell: (r) => <span className="font-medium">{amount(r.net)}</span> },
    { key: "employerCost", header: "Coût employeur", align: "end", sortValue: (r) => r.employerCost, cell: (r) => amount(r.employerCost) },
  ];
  const t = totalsOf(rows);
  const d = (k) => pctDelta(totals[k], prevTotals?.[k]);

  return (
    <>
      <Button variant="ghost" size="sm" icon={ArrowLeft} href="/app/payroll" className="mb-[0.8em] -ms-[0.5em]">Paie</Button>
      <PageHeader
        eyebrow="Détail de la paie"
        title={label}
        description={`${int(run.headcount)} bulletins${run.payDate ? ` · paiement le ${date(run.payDate)}` : ""}${run.validatedBy && empById[run.validatedBy] ? ` · validée par ${fullName(empById[run.validatedBy])}` : ""}`}
        actions={
          <>
            {locked ? <StatusBadge status="closed" map={PAYROLL_STATUS} /> : <StatusBadge status={run.status} map={PAYROLL_STATUS} />}
            {locked && <Lock className="size-[1.1em] text-fg-muted" aria-label="Période verrouillée" />}
            <Button variant="secondary" icon={Download} onClick={exportCsv}>Exporter CSV</Button>
            {run.status === "validated" && <Button variant="secondary" href="/app/payroll/runs/new">Paiement et déclarations</Button>}
            {canClose && <Button icon={Lock} onClick={() => setClosing(true)}>Clôturer la période</Button>}
          </>
        }
      />

      <div className="flex flex-col gap-[1.5em]">
        <Card><Timeline run={run} /></Card>

        <section aria-label="Totaux" className="grid grid-cols-1 gap-[1em] sm:grid-cols-2 lg:grid-cols-3 xxl:grid-cols-5">
          <KpiCard label="Masse brute" value={money(totals.gross, { decimals: 0 })} hint={d("gross") != null && <span className="inline-flex items-center gap-[0.4em]"><Delta value={d("gross")} className="!bg-neutral-bg !text-neutral-fg" />vs mois préc.</span>} />
          <KpiCard label="CNAS salarié" value={money(totals.cnasEmployee, { decimals: 0 })} />
          <KpiCard label="IRG" value={money(totals.irg, { decimals: 0 })} />
          <KpiCard accent label="Net à payer" value={money(totals.net, { decimals: 0 })} hint={d("net") != null && <span className="inline-flex items-center gap-[0.4em]"><Delta value={d("net")} className="!bg-neutral-bg !text-neutral-fg" />vs mois préc.</span>} />
          <KpiCard label="Coût employeur" value={money(totals.employerCost, { decimals: 0 })} hint={d("employerCost") != null && <span className="inline-flex items-center gap-[0.4em]"><Delta value={d("employerCost")} className="!bg-neutral-bg !text-neutral-fg" />vs mois préc.</span>} />
        </section>

        <section aria-labelledby="lines-title">
          <div className="mb-[0.8em] flex flex-wrap items-center justify-between gap-[0.8em]">
            <h2 id="lines-title" className="text-h3 font-semibold text-fg">Bulletins</h2>
            <SearchInput className="w-full sm:w-[18em]" placeholder="Nom ou matricule" onChange={setQ} />
          </div>
          <DataTable
            columns={columns}
            rows={rows}
            pageSize={12}
            onRowClick={openRow}
            defaultSort={{ key: "name", dir: "asc" }}
            footerRow={{ name: `Total · ${int(rows.length)} salariés`, gross: amount(t.gross), cnasEmployee: `−${amount(t.cnasEmployee)}`, irg: `−${amount(t.irg)}`, retenues: `−${amount(t.loanDeduction + t.otherDeductions)}`, net: amount(t.net), employerCost: amount(t.employerCost) }}
            empty={<EmptyState title="Aucun bulletin" description="Aucun salarié ne correspond à cette recherche." />}
          />
        </section>
      </div>

      <Drawer
        open={!!open}
        onClose={() => setOpen(null)}
        width="58em"
        title={open ? `Bulletin · ${fullName(open.employee)}` : ""}
        description={`${label} · ${open?.employee.matricule ?? ""}`}
        footer={
          open && (
            <>
              <Button variant="ghost" icon={ExternalLink} href={`/app/payslips/${run.id}/${open.employeeId}`}>Page complète</Button>
              <Button icon={Printer} onClick={printPage}>Imprimer / PDF</Button>
            </>
          )
        }
      >
        {open && <PayslipDocument employee={open.employee} line={open} period={run.period} status={run.status} payDate={run.payDate ?? run.paidAt} showEmployer />}
      </Drawer>

      <Modal
        open={closing}
        onClose={() => setClosing(false)}
        size="sm"
        title="Clôturer la période ?"
        description="La paie devient en lecture seule. Une réouverture exigera un motif."
        footer={
          <>
            <Button variant="ghost" onClick={() => setClosing(false)}>Annuler</Button>
            <Button variant="danger-solid" disabled={typed.trim().toUpperCase() !== "CLÔTURER"} onClick={close}>Clôturer</Button>
          </>
        }
      >
        <TextInput label="Tapez CLÔTURER pour confirmer" value={typed} onChange={setTyped} autoComplete="off" />
      </Modal>
    </>
  );
}

export default function RunDetail({ id }) {
  return <AccessGate roles={["admin", "hr", "accountant"]}>{(user) => <Body id={id} user={user} />}</AccessGate>;
}
