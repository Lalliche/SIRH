"use client";

import { useMemo } from "react";
import { useCollection, useDb } from "@/lib/db";
import { amount, date, dateLong, money, periodLabel } from "@/lib/format";
import { periodEnd, periodStart, ytdFor } from "@/lib/payroll-run";
import { cn } from "@/lib/utils";
import { Paper, PrintOnly } from "@/components/app/_kit/Print";

const maskRib = (rib) => (rib ? `${rib.slice(0, 5)} •••• ${rib.slice(-4)}` : "—");
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Label ……… amount with a dotted leader (ledger convention). */
function Row({ label, hint, value, sign, strong, muted, className }) {
  return (
    <div className={cn("flex items-baseline gap-[0.6em] py-[0.22em]", strong && "font-semibold", muted && "text-black/55", className)}>
      <span className="shrink-0">
        {label}
        {hint && <span className="ms-[0.5em] font-normal text-black/55">{hint}</span>}
      </span>
      <span aria-hidden className="min-w-[1.5em] flex-1 translate-y-[-0.22em] border-b border-dotted border-black/35" />
      <span className="shrink-0 text-end num">
        {sign ? `${sign} ` : ""}
        {amount(value)}
      </span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-[1.1em]">
      <h4 className="mb-[0.3em] border-b border-black/70 pb-[0.25em] text-[0.82em] font-semibold uppercase tracking-[0.08em] text-black/70">{title}</h4>
      {children}
    </section>
  );
}

function Field({ label, children, mono }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.82em] text-black/55">{label}</dt>
      <dd className={cn("truncate font-medium", mono && "font-mono text-[0.95em]")}>{children || "—"}</dd>
    </div>
  );
}

/** Static ink cachet printed on the slip (the animated Stamp is reserved for the validation screens). */
function Cachet({ label, sub }) {
  return (
    <div
      aria-label={label}
      className="inline-flex size-[6.2em] -rotate-[9deg] flex-col items-center justify-center rounded-full border-[3px] border-pine-700/85 text-pine-700/85"
      style={{ boxShadow: "inset 0 0 0 3px #fff, inset 0 0 0 4px currentColor" }}
    >
      <span className="font-display text-[1.05em] font-bold tracking-[0.08em]">{label}</span>
      {sub && <span className="mt-[0.15em] text-[0.6em] font-semibold tracking-[0.1em]">{sub}</span>}
    </div>
  );
}

function PayslipPaper({ employee, line, period, company, position, department, ytd, status, showEmployer, payDate }) {
  const comps = line.components ?? [];
  const totalRetenues = (line.cnasEmployee ?? 0) + (line.irg ?? 0) + (line.loanDeduction ?? 0) + (line.otherDeductions ?? 0);
  const prorata = line.ratio != null && line.ratio < 1;
  const leave = employee.leaveBalance;
  const stampLabel = status === "paid" || status === "declared" || status === "closed" ? "PAYÉ" : "VALIDÉ";
  const ref = `BP-${period}-${employee.matricule}`;
  return (
    <div className="text-[0.75em] leading-[1.45] text-black">
      <header className="flex flex-wrap items-start justify-between gap-[1.5em] border-b-[3px] border-double border-black/70 pb-[1.1em]">
        <div className="min-w-0">
          <p className="font-display text-[1.7em] font-semibold leading-tight">{company.name}</p>
          <p className="mt-[0.3em] text-black/65">{company.address}</p>
          <p className="text-black/65">NIF <span className="font-mono">{company.nif}</span> · NIS <span className="font-mono">{company.nis}</span></p>
          <p className="text-black/65">RC <span className="font-mono">{company.rc}</span> · N° employeur CNAS <span className="font-mono">{company.cnasEmployerNo}</span></p>
        </div>
        <div className="text-end">
          <p className="font-display text-[1.5em] font-semibold tracking-[0.04em]">BULLETIN DE PAIE</p>
          <p className="mt-[0.2em] text-[1.15em] font-medium">{cap(periodLabel(period))}</p>
          <p className="text-black/65">Du {date(periodStart(period))} au {date(periodEnd(period))}</p>
          {payDate && <p className="text-black/65">Paiement par virement le {date(payDate)}</p>}
          <p className="mt-[0.2em] font-mono text-[0.9em] text-black/55">{ref}</p>
        </div>
      </header>

      <dl className="mt-[1em] grid grid-cols-2 gap-x-[1.2em] gap-y-[0.6em] rounded-sm bg-black/[0.035] p-[0.9em] sm:grid-cols-4">
        <Field label="Salarié">{employee.lastName.toUpperCase()} {employee.firstName}</Field>
        <Field label="Matricule" mono>{employee.matricule}</Field>
        <Field label="N° CNAS" mono>{employee.cnasNumber}</Field>
        <Field label="NIN" mono>{employee.nin}</Field>
        <Field label="Poste">{position?.title}</Field>
        <Field label="Service">{department?.name}</Field>
        <Field label="Date d'entrée">{date(employee.hireDate)}</Field>
        <Field label="Contrat">{employee.contract?.type}{employee.contract?.endDate ? ` · jusqu'au ${date(employee.contract.endDate)}` : ""}</Field>
        <Field label="Situation familiale">{employee.maritalStatus}{employee.children ? ` · ${employee.children} enfant${employee.children > 1 ? "s" : ""}` : ""}</Field>
        <Field label="Compte (RIB)" mono>{maskRib(employee.rib)}</Field>
        <Field label="Jours payés">{line.workedDays != null ? `${line.workedDays} / ${line.contractualDays} j` : "Mois complet"}</Field>
        <Field label="Mode de paiement">Virement bancaire</Field>
      </dl>

      <Section title="Éléments de rémunération">
        <Row label="Salaire de base" hint={prorata ? `prorata ${line.workedDays}/${line.contractualDays} j` : undefined} value={line.base} />
        {comps.map((c) => (
          <Row key={c.code + c.label} label={c.label} value={c.amount} />
        ))}
        {line.overtimePay > 0 && <Row label="Heures supplémentaires" hint={line.overtimeHours ? `${String(line.overtimeHours).replace(".", ",")} h · majorées de 50 %` : undefined} value={line.overtimePay} />}
        <div className="mt-[0.5em] flex items-baseline justify-between rounded-sm border border-black/70 px-[0.8em] py-[0.5em] font-semibold">
          <span>SALAIRE BRUT</span>
          <span className="num">{amount(line.gross)}</span>
        </div>
      </Section>

      <Section title="Cotisations et retenues">
        <Row label="Cotisation CNAS salarié" hint={`9 % de ${amount(line.cotisable)}`} value={line.cnasEmployee} sign="−" />
        <Row label="Assiette imposable IRG" hint="brut imposable − CNAS" value={line.taxable} muted />
        <Row label="IRG · retenue à la source" value={line.irg} sign="−" />
        {line.loanDeduction > 0 && <Row label="Retenue prêt / avance" value={line.loanDeduction} sign="−" />}
        {line.otherDeductions > 0 && <Row label="Autres retenues" value={line.otherDeductions} sign="−" />}
        <Row label="Total des retenues" value={totalRetenues} sign="−" strong className="mt-[0.3em] border-t border-black/30 pt-[0.35em]" />
      </Section>

      <div className="mt-[1.1em] flex items-end justify-between gap-[1em] rounded-sm border border-black/80 border-b-[5px] border-double bg-black/[0.035] px-[1em] py-[0.8em]">
        <div>
          <p className="text-[0.82em] font-semibold uppercase tracking-[0.08em] text-black/65">Net à payer</p>
          <p className="text-[0.9em] text-black/60">en dinars algériens (DA)</p>
        </div>
        <p className="font-display text-[2em] font-semibold leading-none num">{money(line.net)}</p>
      </div>

      {showEmployer && (
        <Section title="Charges patronales (information employeur)">
          <Row label="Cotisation CNAS employeur" hint="25 %" value={line.cnasEmployer} />
          <Row label="FNPOS" hint="0,5 %" value={line.fnpos} />
          <Row label="Coût total employeur" value={line.employerCost} strong className="mt-[0.3em] border-t border-black/30 pt-[0.35em]" />
        </Section>
      )}

      <div className="mt-[1.1em] grid gap-[1.2em] sm:grid-cols-[1.4fr_1fr]">
        <section>
          <h4 className="mb-[0.3em] border-b border-black/70 pb-[0.25em] text-[0.82em] font-semibold uppercase tracking-[0.08em] text-black/70">
            Cumuls {period.slice(0, 4)}{ytd?.count ? ` · ${ytd.count} bulletin${ytd.count > 1 ? "s" : ""}` : ""}
          </h4>
          {ytd?.count ? (
            <>
              <Row label="Brut cumulé" value={ytd.gross} />
              <Row label="Imposable cumulé" value={ytd.taxable} />
              <Row label="CNAS cumulée" value={ytd.cnasEmployee} />
              <Row label="IRG cumulé" value={ytd.irg} />
              <Row label="Net cumulé" value={ytd.net} strong />
            </>
          ) : (
            <p className="text-black/55">Premier bulletin de l’année.</p>
          )}
        </section>
        <section>
          <h4 className="mb-[0.3em] border-b border-black/70 pb-[0.25em] text-[0.82em] font-semibold uppercase tracking-[0.08em] text-black/70">Congés</h4>
          <p className="py-[0.22em]">Solde : <span className="font-semibold num">{leave?.annual ?? "—"} j</span></p>
          <p className="py-[0.22em]">Pris cette année : <span className="font-semibold num">{leave?.taken ?? "—"} j</span></p>
          {line.absenceDays > 0 && <p className="py-[0.22em]">Absences non payées : <span className="font-semibold num">{line.absenceDays} j</span></p>}
        </section>
      </div>

      <footer className="mt-[1.4em] flex items-end justify-between gap-[1em] border-t border-black/20 pt-[0.9em]">
        <div className="max-w-[28em] text-black/55">
          <p>Bulletin à conserver sans limitation de durée. Établi le {dateLong(payDate ?? periodEnd(period))}.</p>
          <p className="mt-[0.2em]">Document de démonstration, non opposable.</p>
        </div>
        <div className="flex items-end gap-[1.5em]">
          <div className="text-center">
            <div className="h-[3.6em] w-[10em] border-b border-black/40" />
            <p className="mt-[0.3em] text-[0.85em] text-black/55">Signature de l’employeur</p>
          </div>
          <Cachet label={stampLabel} sub={company.name.split(" ")[0].toUpperCase()} />
        </div>
      </footer>
    </div>
  );
}

/**
 * A4 payslip (design-system "payslip paper"). Named + default export.
 *
 * @param {object} props
 * @param {object} props.employee  employee record
 * @param {object} props.line      a payroll run line (`run.lines[i]`) — gross, cnasEmployee, irg, net, components…
 * @param {string} props.period    "YYYY-MM"
 * @param {string} [props.status]  run status (drives the cachet: VALIDÉ / PAYÉ)
 * @param {boolean} [props.showEmployer] show employer charges (hide it on the employee's own view)
 * @param {boolean} [props.printable=true] also mount the print-only copy (window.print → PDF)
 * @param {string} [props.payDate]
 * @param {object} [props.company] defaults to db company
 * @param {object} [props.ytd] defaults to the cumul computed from payrollRuns
 */
export function PayslipDocument({ employee, line, period, status = "validated", showEmployer = false, printable = true, payDate, company: companyProp, ytd: ytdProp, className }) {
  const dbCompany = useDb((s) => s.company);
  const positions = useCollection("positions");
  const departments = useCollection("departments");
  const runs = useCollection("payrollRuns");
  const company = companyProp ?? dbCompany;
  const position = useMemo(() => positions.find((p) => p.id === employee.positionId), [positions, employee.positionId]);
  const department = useMemo(() => departments.find((d) => d.id === employee.departmentId), [departments, employee.departmentId]);
  const ytd = useMemo(() => ytdProp ?? ytdFor(employee.id, period, runs), [ytdProp, employee.id, period, runs]);

  const props = { employee, line, period, company, position, department, ytd, status, showEmployer, payDate };
  return (
    <>
      <div className={cn("overflow-x-auto", className)}>
        <Paper className="min-w-[44em] rounded-xs print:hidden">
          <PayslipPaper {...props} />
        </Paper>
      </div>
      {printable && (
        <PrintOnly>
          <Paper>
            <PayslipPaper {...props} />
          </Paper>
        </PrintOnly>
      )}
    </>
  );
}

export default PayslipDocument;
