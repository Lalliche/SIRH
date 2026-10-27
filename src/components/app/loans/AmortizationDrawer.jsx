"use client";

import { useState } from "react";
import { CircleDollarSign } from "lucide-react";
import { Badge, Button, ConfirmDialog, Drawer, PersonCell, Progress, StatusBadge, toast } from "@/components/ui";
import { db } from "@/lib/db";
import { date, fullName, money, periodLabel } from "@/lib/format";
import { useCurrentUser } from "@/lib/use-current-user";
import { INSTALLMENT_STATUS, LOAN_STATUS, LOAN_TYPES, buildSchedule, lastInstallment, monthsFor } from "./loan-utils";

const m0 = (v) => money(v, { decimals: 0 });

export default function AmortizationDrawer({ loan, employee, department, canEdit, onClose }) {
  const me = useCurrentUser();
  const [confirm, setConfirm] = useState(false);
  const schedule = loan ? buildSchedule(loan) : [];
  const paidAmount = loan ? loan.total - loan.remaining : 0;

  const repay = () => {
    const before = loan;
    db.patch("loans", loan.id, { remaining: 0, status: "closed", closedAt: "2026-10-27", earlyRepayment: true });
    db.audit(me.employeeId, "Remboursement anticipé", fullName(employee), `${m0(loan.remaining)} soldés`);
    toast.success(`Prêt de ${employee.firstName} soldé`, { action: { label: "Annuler", onClick: () => db.update("loans", (l) => l.map((x) => (x.id === before.id ? before : x))) } });
    onClose();
  };

  return (
    <>
      <Drawer
        open={!!loan}
        onClose={onClose}
        width="32em"
        title="Échéancier"
        description={loan ? `${LOAN_TYPES[loan.type]?.label} · ${m0(loan.total)}` : ""}
        footer={loan && canEdit && loan.status === "active" ? (
          <>
            <Button variant="ghost" onClick={onClose}>Fermer</Button>
            <Button variant="secondary" icon={CircleDollarSign} onClick={() => setConfirm(true)}>Remboursement anticipé</Button>
          </>
        ) : undefined}
      >
        {loan && (
          <div className="flex flex-col gap-[1.1em]">
            <div className="flex items-center justify-between gap-[1em]">
              <PersonCell employee={employee} sub={department} size="md" />
              <StatusBadge status={loan.status} map={LOAN_STATUS} />
            </div>
            {loan.reason && <p className="text-sm text-fg-secondary">« {loan.reason} »</p>}
            {loan.rejectReason && <p className="rounded-md bg-danger-bg px-[0.9em] py-[0.6em] text-sm text-danger-fg">Motif du refus : {loan.rejectReason}</p>}

            <div>
              <Progress value={paidAmount} max={loan.total} tone="primary" />
              <dl className="mt-[0.7em] grid grid-cols-3 gap-[0.75em] text-sm">
                <div><dt className="text-fg-muted">Remboursé</dt><dd className="font-medium text-fg num">{m0(paidAmount)}</dd></div>
                <div><dt className="text-fg-muted">Reste à payer</dt><dd className="font-medium text-fg num">{m0(loan.remaining)}</dd></div>
                <div><dt className="text-fg-muted">Mensualité</dt><dd className="font-medium text-fg num">{m0(loan.monthly)}</dd></div>
              </dl>
              <p className="mt-[0.6em] text-xs text-fg-muted">{monthsFor(loan.total, loan.monthly)} échéances, dernière de {m0(lastInstallment(loan.total, loan.monthly))}. Les retenues sont injectées automatiquement dans la paie.</p>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="h-[2.4em] bg-bg-sunken text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">
                    <th className="ps-[1em] text-start font-semibold">N°</th>
                    <th className="text-start font-semibold">Paie de</th>
                    <th className="text-end font-semibold">Montant</th>
                    <th className="text-end font-semibold">Restant dû</th>
                    <th className="pe-[1em] text-end font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((s) => (
                    <tr key={s.n} className="h-[2.4em] border-t border-border-subtle">
                      <td className="ps-[1em] num text-fg-muted">{s.n}</td>
                      <td className="capitalize text-fg">{periodLabel(s.period)}</td>
                      <td className="num text-end text-fg">{m0(s.amount)}</td>
                      <td className="num text-end text-fg-secondary">{m0(s.balance)}</td>
                      <td className="pe-[1em] text-end"><Badge tone={INSTALLMENT_STATUS[s.status].tone}>{INSTALLMENT_STATUS[s.status].label}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-fg-muted">Début des retenues : {date(loan.startDate)}.</p>
          </div>
        )}
      </Drawer>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={repay}
        title="Solder ce prêt ?"
        description={loan ? `Le solde restant de ${m0(loan.remaining)} sera considéré comme remboursé et les retenues futures seront supprimées de la paie.` : ""}
        confirmLabel="Confirmer le remboursement"
      />
    </>
  );
}
