"use client";

import { useMemo, useState } from "react";
import { FileX2, Printer, Wallet } from "lucide-react";
import { Button, Card, CardHeader, Delta, EmptyState, PageHeader, Tabs } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { printPage } from "@/components/app/_kit/Print";
import MoneyFlow from "@/components/app/payroll/MoneyFlow";
import { periodShort } from "@/components/app/payroll/utils";
import { usePayrollRuns, useParams } from "@/components/app/payroll/hooks";
import { PAYROLL_STATUS } from "@/data/constants";
import { amount, periodLabel } from "@/lib/format";
import { payslipsOf, ytdFor } from "@/lib/payroll-run";
import { StatusBadge } from "@/components/ui";
import { PayslipDocument } from "./PayslipDocument";
import PayslipExplain from "./PayslipExplain";

const cap = (s) => s[0].toUpperCase() + s.slice(1);

function Body({ user }) {
  const runs = usePayrollRuns();
  const params = useParams();
  const employee = user.employee;
  const slips = useMemo(() => (employee ? payslipsOf(employee.id, runs) : []), [employee, runs]);
  const [picked, setPicked] = useState(null);
  const current = slips.find((s) => s.run.period === picked) ?? slips[0];
  const previous = current ? slips[slips.indexOf(current) + 1] : null;
  const ytd = useMemo(() => (current && employee ? ytdFor(employee.id, current.run.period, runs) : null), [current, employee, runs]);
  const canSeeTeam = ["admin", "hr", "accountant"].includes(user.role);

  const header = (
    <PageHeader
      eyebrow="Paie"
      title="Mes bulletins"
      description={
        canSeeTeam
          ? "Vos propres bulletins de paie. Les bulletins de l'équipe se consultent depuis le détail de chaque paie."
          : "Retrouvez vos bulletins mois par mois, imprimez-les ou enregistrez-les en PDF."
      }
      actions={
        <>
          {canSeeTeam && <Button variant="secondary" href="/app/payroll">Paies de l’entreprise</Button>}
          <Button icon={Printer} onClick={printPage} disabled={!current}>Imprimer / PDF</Button>
        </>
      }
    />
  );

  if (!employee || slips.length === 0) {
    return (
      <>
        {header}
        <Card padded={false}>
          <EmptyState
            icon={FileX2}
            title="Aucun bulletin disponible pour le moment"
            description="Votre premier bulletin apparaîtra ici dès la validation de la paie du mois. Si vous venez d'arriver, il sera calculé au prorata de vos jours de présence."
            action={<Button href="/app" variant="secondary">Retour au tableau de bord</Button>}
          />
        </Card>
      </>
    );
  }

  const dNet = previous ? Math.round(((current.line.net - previous.line.net) / previous.line.net) * 1000) / 10 : null;

  return (
    <>
      {header}
      <Tabs
        className="mb-[1.25em]"
        value={current.run.period}
        onChange={setPicked}
        tabs={slips.map((s) => ({ value: s.run.period, label: `${periodShort(s.run.period)} ${s.run.period.slice(0, 4)}` }))}
      />
      <div className="grid items-start gap-[1.25em] lg:grid-cols-[minmax(0,1fr)_21em]">
        <div className="min-w-0">
          <PayslipDocument
            employee={employee}
            line={current.line}
            period={current.run.period}
            status={current.run.status}
            payDate={current.run.payDate ?? current.run.paidAt}
          />
        </div>
        <aside className="flex flex-col gap-[1.25em] lg:sticky lg:top-[1em]">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Net à payer · {periodLabel(current.run.period)}</p>
            <p className="mt-[0.4em] font-display text-kpi font-semibold text-fg"><MoneyFlow value={current.line.net} decimals={2} /></p>
            <div className="mt-[0.6em] flex flex-wrap items-center gap-[0.6em]">
              <StatusBadge status={current.run.status} map={PAYROLL_STATUS} />
              {dNet != null && (
                <span className="inline-flex items-center gap-[0.4em] text-xs text-fg-muted">
                  <Delta value={dNet} /> vs {periodLabel(previous.run.period)}
                </span>
              )}
            </div>
            {previous && (
              <dl className="mt-[1em] grid grid-cols-2 gap-[0.6em] border-t border-border-subtle pt-[0.9em] text-sm">
                <dt className="text-fg-muted">Brut</dt>
                <dd className="text-end num">{amount(current.line.gross)}</dd>
                <dt className="text-fg-muted">Mois précédent</dt>
                <dd className="text-end text-fg-secondary num">{amount(previous.line.gross)}</dd>
              </dl>
            )}
          </Card>

          {ytd && (
            <Card>
              <CardHeader title={`Cumul ${current.run.period.slice(0, 4)}`} description={`${ytd.count} bulletin${ytd.count > 1 ? "s" : ""} disponible${ytd.count > 1 ? "s" : ""} (DA)`} />
              <dl className="flex flex-col gap-[0.55em] text-sm">
                {[
                  ["Brut cumulé", ytd.gross],
                  ["Imposable cumulé", ytd.taxable],
                  ["CNAS cumulée", ytd.cnasEmployee],
                  ["IRG cumulé", ytd.irg],
                ].map(([label, v]) => (
                  <div key={label} className="flex items-baseline justify-between gap-[1em]">
                    <dt className="text-fg-muted">{label}</dt>
                    <dd className="text-fg-secondary num">{amount(v)}</dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-[1em] border-t-[3px] border-double border-border-strong pt-[0.6em] font-semibold">
                  <dt>Net cumulé</dt>
                  <dd className="num"><MoneyFlow value={ytd.net} decimals={2} suffix="" /></dd>
                </div>
              </dl>
            </Card>
          )}

          <Card>
            <CardHeader title="Comprendre mon bulletin" description={`${cap(periodLabel(current.run.period))}, en langage simple`} action={<Wallet className="size-[1.2em] text-fg-faint" aria-hidden />} />
            <PayslipExplain line={current.line} params={params} />
          </Card>
        </aside>
      </div>
    </>
  );
}

export default function MyPayslips() {
  return <AccessGate>{(user) => <Body user={user} />}</AccessGate>;
}
