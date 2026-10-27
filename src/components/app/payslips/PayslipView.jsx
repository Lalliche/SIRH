"use client";

import { useMemo } from "react";
import { ArrowLeft, FileX2, Printer } from "lucide-react";
import { Button, Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { printPage } from "@/components/app/_kit/Print";
import { usePayrollRuns } from "@/components/app/payroll/hooks";
import { deMois, periodTitle } from "@/components/app/payroll/utils";
import { PAYROLL_STATUS } from "@/data/constants";
import { useCollection } from "@/lib/db";
import { fullName } from "@/lib/format";
import { can } from "@/lib/session";
import { PayslipDocument } from "./PayslipDocument";

function Body({ user, runId, employeeId }) {
  const runs = usePayrollRuns();
  const employees = useCollection("employees");
  const run = useMemo(() => runs.find((r) => r.id === runId), [runs, runId]);
  const employee = useMemo(() => employees.find((e) => e.id === employeeId), [employees, employeeId]);
  const line = run?.lines.find((l) => l.employeeId === employeeId);
  const staff = can(user.role, "payroll");
  const allowed = staff || user.employeeId === employeeId;

  if (!allowed) {
    return <EmptyState icon={FileX2} title="Bulletin non accessible" description="Vous ne pouvez consulter que vos propres bulletins." action={<Button href="/app/payslips">Mes bulletins</Button>} />;
  }
  if (!run || !employee || !line) {
    return <EmptyState icon={FileX2} title="Bulletin introuvable" description="Ce bulletin n'existe pas ou la paie correspondante n'a pas été validée." action={<Button href={staff ? "/app/payroll" : "/app/payslips"}>Retour</Button>} />;
  }
  return (
    <>
      <Button variant="ghost" size="sm" icon={ArrowLeft} href={staff ? `/app/payroll/runs/${run.id}` : "/app/payslips"} className="mb-[0.8em] -ms-[0.5em]">
        {staff ? `Paie ${deMois(run.period)}` : "Mes bulletins"}
      </Button>
      <PageHeader
        title={`Bulletin · ${fullName(employee)}`}
        description={`${periodTitle(run.period)} · ${employee.matricule}`}
        actions={
          <>
            <StatusBadge status={run.status} map={PAYROLL_STATUS} />
            <Button icon={Printer} onClick={printPage}>Imprimer / PDF</Button>
          </>
        }
      />
      <Card padded={false} className="bg-bg-sunken p-[1em] shadow-none sm:p-[1.5em]">
        <PayslipDocument employee={employee} line={line} period={run.period} status={run.status} payDate={run.payDate ?? run.paidAt} showEmployer={staff} />
      </Card>
    </>
  );
}

export default function PayslipView({ runId, employeeId }) {
  return <AccessGate>{(user) => <Body user={user} runId={runId} employeeId={employeeId} />}</AccessGate>;
}
