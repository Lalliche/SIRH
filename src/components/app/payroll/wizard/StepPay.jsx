"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Banknote, Download, FileCheck2, FileText } from "lucide-react";
import { Badge, Button, Card, CardHeader, ConfirmDialog, Stamp } from "@/components/ui";
import { downloadCsv } from "@/components/app/_kit/csv";
import { amount, date, int, money } from "@/lib/format";
import { bankTransferRows } from "@/lib/payroll-run";
import { periodTitle } from "../utils";

export default function StepPay({ run, empById, onBankFile, onPaid, onFinish, canPay }) {
  const [confirm, setConfirm] = useState(false);
  const bank = useMemo(() => bankTransferRows(run, empById), [run, empById]);
  const paid = run.status === "paid" || run.status === "declared" || run.status === "closed";
  const generated = !!run.bankFileAt;

  const generate = () => {
    downloadCsv(
      `virements-${run.period}.csv`,
      bank.rows,
      [
        { key: "matricule", header: "Matricule" },
        { key: "name", header: "Bénéficiaire" },
        { key: "rib", header: "RIB" },
        { key: "amount", header: "Montant (DA)", value: (r) => String(r.amount).replace(".", ",") },
        { key: "label", header: "Libellé" },
      ],
    );
    onBankFile();
  };

  return (
    <div className="grid items-start gap-[1.25em] lg:grid-cols-[1fr_16em]">
      <div className="flex flex-col gap-[1.25em]">
        <Card>
          <CardHeader
            title="Fichier de virement"
            description="Format de démonstration, à adapter au modèle de votre banque."
            action={generated ? <Badge tone="success">Généré le {date(run.bankFileAt)}</Badge> : <Badge tone="neutral">À générer</Badge>}
          />
          <dl className="grid gap-[1em] sm:grid-cols-3">
            <div><dt className="text-xs text-fg-muted">Virements</dt><dd className="mt-[0.15em] font-medium text-fg num">{int(bank.rows.length)}</dd></div>
            <div><dt className="text-xs text-fg-muted">Montant total</dt><dd className="mt-[0.15em] font-medium text-fg num">{money(bank.total, { decimals: 2 })}</dd></div>
            <div><dt className="text-xs text-fg-muted">Exclus (RIB manquant)</dt><dd className="mt-[0.15em] font-medium text-fg num">{bank.excluded.length}</dd></div>
          </dl>
          <div className="mt-[1.2em] flex flex-wrap gap-[0.6em]">
            <Button icon={Download} variant={generated ? "secondary" : "primary"} onClick={generate} disabled={bank.rows.length === 0}>{generated ? "Télécharger à nouveau" : "Générer le fichier de virement"}</Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Paiement" description={`Date de paiement prévue : ${date(run.payDate)}`} action={paid ? <Badge tone="success">Payée le {date(run.paidAt)}</Badge> : <Badge tone="brand">Validée</Badge>} />
          {paid ? (
            <p className="text-sm text-fg-secondary">Les salariés ont été notifiés : leur bulletin est disponible dans « Mes bulletins ».</p>
          ) : (
            <>
              <p className="text-sm text-fg-secondary">Une fois les virements exécutés par la banque, marquez la paie comme payée. Les salariés sont alors notifiés.</p>
              <Button className="mt-[1em]" icon={Banknote} disabled={!generated || !canPay} onClick={() => setConfirm(true)}>Marquer la paie comme payée</Button>
              {!generated && <p className="mt-[0.6em] text-xs text-fg-muted">Générez d’abord le fichier de virement.</p>}
            </>
          )}
        </Card>

        <Card>
          <CardHeader title="Déclarations à préparer" description="Pré-remplies depuis cette paie" />
          <ul className="divide-y divide-border-subtle text-sm">
            {[
              ["G50", "Retenues à la source (DGI)", "avant le 20 novembre [à confirmer]"],
              ["CNAS mensuel", "Cotisations de la période", "avant le 20 novembre [à confirmer]"],
              ["DAS / G29", "Déclarations annuelles", "31 janvier / 30 avril"],
            ].map(([k, d, due]) => (
              <li key={k} className="flex items-center justify-between gap-[1em] py-[0.7em]">
                <span><span className="font-medium text-fg">{k}</span><span className="block text-xs text-fg-muted">{d} · {due}</span></span>
                <Button size="sm" variant="soft" href="/app/payroll/declarations" iconEnd={ArrowRight}>Préparer</Button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-[0.8em]">
          <Button variant="secondary" icon={FileText} href={`/app/payroll/runs/${run.id}`}>Voir le détail et les bulletins</Button>
          <Button iconEnd={FileCheck2} onClick={onFinish}>Terminer</Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-[0.8em] pt-[1em] text-center">
        <Stamp key={paid ? "paid" : "validated"} label={paid ? "PAYÉ" : "VALIDÉ"} sub={periodTitle(run.period).toUpperCase()} className="!size-[9em]" />
        <p className="text-sm text-fg-secondary">{paid ? "Paie payée" : "Paie validée"} · {int(run.headcount)} bulletins</p>
        <p className="text-xs text-fg-muted">Net {amount(run.totals.net, { decimals: 0 })} DA</p>
        <Link href="/app/payslips" className="text-xs text-link hover:underline">Aperçu côté salarié</Link>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={onPaid}
        title="Marquer la paie comme payée ?"
        description={`${int(bank.rows.length)} virements pour ${money(bank.total)}. Les salariés seront notifiés que leur bulletin est disponible.`}
        confirmLabel="Marquer comme payée"
      />
    </div>
  );
}
