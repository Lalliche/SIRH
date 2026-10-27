"use client";

import { useMemo, useState } from "react";
import { Banknote, Check, CreditCard, Download, Landmark, Printer, Smartphone } from "lucide-react";
import { Badge, Button, Card, CardHeader, DataTable, Modal, PageHeader, Progress, toast } from "@/components/ui";
import { Paper, PrintOnly, printPage } from "@/components/app/_kit/Print";
import AccessGate from "@/components/app/_kit/AccessGate";
import { fileSize } from "@/components/app/_kit/csv";
import { db, useCollection, useDb } from "@/lib/db";
import { cn } from "@/lib/utils";
import { date, dateLong, money } from "@/lib/format";
import InvoiceSheet from "./InvoiceSheet";
import UpgradeModal from "./UpgradeModal";
import { INVOICES, METHODS, PLANS, ttc } from "./data";

const METHOD_ICON = { virement: Landmark, ccp: Banknote, baridimob: Smartphone };

function Meter({ label, used, max, format = String }) {
  const ratio = used / max;
  return (
    <div>
      <div className="mb-[0.4em] flex items-baseline justify-between text-sm"><span className="text-fg-secondary">{label}</span><span className="font-medium text-fg num">{format(used)} / {format(max)}</span></div>
      <Progress value={used} max={max} tone={ratio > 0.95 ? "danger" : ratio > 0.8 ? "warning" : "primary"} />
      {ratio > 0.8 && <p className="mt-[0.3em] text-xs text-warning-fg">{ratio > 0.95 ? "Limite presque atteinte." : "Plus de 80 % utilisés."} Pensez à changer d&apos;offre.</p>}
    </div>
  );
}

function Content({ user }) {
  const company = useDb((s) => s.company);
  const billing = useDb((s) => s.settings.billing);
  const employees = useCollection("employees");
  const documents = useCollection("documents");
  const [invoice, setInvoice] = useState(null);
  const [upgrade, setUpgrade] = useState(null);

  const currentPlan = PLANS.find((p) => p.key === company.plan) ?? PLANS[1];
  const active = employees.filter((e) => e.status !== "sorti").length;
  const storage = documents.reduce((s, d) => s + d.size, 0);
  const method = billing?.paymentMethod ?? "virement";
  const nextAmount = ttc(currentPlan.price);

  const columns = useMemo(() => [
    { key: "id", header: "Facture", cell: (i) => <span className="font-medium text-fg num">{i.id}</span> },
    { key: "date", header: "Date", cell: (i) => <span className="num">{date(i.date)}</span> },
    { key: "label", header: "Désignation", className: "text-fg-secondary" },
    { key: "ttc", header: "Montant TTC", align: "end", sortValue: (i) => ttc(i.ht), cell: (i) => money(ttc(i.ht), { decimals: 0 }) },
    { key: "status", header: "Statut", sortable: false, cell: () => <Badge tone="success" icon={Check}>Payée</Badge> },
    { key: "pdf", header: "", sortable: false, cell: (i) => <Button variant="soft" size="sm" icon={Download} aria-label={`Ouvrir la facture ${i.id}`} onClick={(e) => { e.stopPropagation(); setInvoice(i); }}>PDF</Button> },
  ], []);

  return (
    <>
      <PageHeader title="Facturation" description="Votre offre, votre consommation et vos factures. Les tarifs affichés sont des tarifs de démonstration." />

      <div className="mb-[1.25em] grid gap-[1em] lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-[1em]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Offre actuelle</p>
              <p className="mt-[0.3em] flex items-center gap-[0.6em] font-display text-h1 font-semibold text-fg">{currentPlan.key}<Badge tone="success">Active</Badge></p>
              <p className="mt-[0.4em] text-fg-secondary"><span className="font-semibold text-fg num">{money(currentPlan.price, { decimals: 0 })}</span> HT / an · jusqu&apos;à {currentPlan.employees} employés · {currentPlan.storage}</p>
              <p className="mt-[0.2em] text-sm text-fg-muted">Prochain renouvellement le {dateLong("2027-01-15")} · {money(nextAmount, { decimals: 0 })} TTC</p>
              {billing?.requestedPlan && billing.requestedPlan !== currentPlan.key && <p className="mt-[0.6em]"><Badge tone="info">Demande en cours : {billing.requestedPlan}</Badge></p>}
            </div>
            <CreditCard className="size-[1.6em] text-fg-faint" aria-hidden strokeWidth={1.4} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Consommation" description="Mise à jour en temps réel" />
          <div className="flex flex-col gap-[1.1em]">
            <Meter label="Employés actifs" used={active} max={currentPlan.employees} />
            <Meter label="Stockage documents" used={storage} max={5 * 1024 ** 3} format={fileSize} />
          </div>
        </Card>
      </div>

      <section aria-labelledby="plans" className="mb-[1.5em]">
        <h2 id="plans" className="mb-[0.8em] text-h3 font-semibold text-fg">Comparer les offres</h2>
        <div className="grid gap-[1em] md:grid-cols-3">
          {PLANS.map((p) => {
            const isCurrent = p.key === currentPlan.key;
            return (
              <Card key={p.key} className={cn("flex flex-col", isCurrent && "border-primary")}>
                <div className="flex items-center justify-between"><h3 className="text-h3 font-semibold text-fg">{p.key}</h3>{isCurrent && <Badge tone="brand">Votre offre</Badge>}</div>
                <p className="mt-[0.6em]"><span className="font-display text-kpi font-semibold text-fg num">{money(p.price, { decimals: 0 })}</span></p>
                <p className="text-xs text-fg-muted">HT par an · jusqu&apos;à {p.employees} employés · {p.storage}</p>
                <ul className="my-[1.2em] flex flex-1 flex-col gap-[0.5em]">
                  {p.features.map((f) => <li key={f} className="flex items-start gap-[0.6em] text-sm text-fg-secondary"><Check className="mt-[0.2em] size-[1.1em] shrink-0 text-success-fg" aria-hidden />{f}</li>)}
                </ul>
                <Button variant={isCurrent ? "secondary" : "primary"} disabled={isCurrent} onClick={() => setUpgrade(p)}>
                  {isCurrent ? "Offre actuelle" : PLANS.indexOf(p) > PLANS.findIndex((x) => x.key === currentPlan.key) ? `Passer à ${p.key}` : `Revenir à ${p.key}`}
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="pay" className="mb-[1.5em]">
        <h2 id="pay" className="mb-[0.8em] text-h3 font-semibold text-fg">Moyen de paiement</h2>
        <div role="radiogroup" aria-label="Moyen de paiement par défaut" className="grid gap-[0.8em] md:grid-cols-3">
          {METHODS.map((m) => {
            const Icon = METHOD_ICON[m.key];
            const on = method === m.key;
            return (
              <button key={m.key} type="button" role="radio" aria-checked={on} onClick={() => { db.update("settings", (s) => ({ ...s, billing: { ...(s.billing ?? {}), paymentMethod: m.key } })); db.audit(user.employeeId, "Moyen de paiement modifié", m.label, ""); toast.success(`${m.label} défini par défaut.`); }}
                className={cn("flex items-start gap-[0.8em] rounded-lg border bg-surface p-[1em] text-start shadow-sm transition-[border-color,box-shadow] hover:shadow-md", on ? "border-primary shadow-md" : "border-border")}>
                <span className="flex size-[2.4em] shrink-0 items-center justify-center rounded-md bg-primary-soft text-link"><Icon className="size-[1.2em]" aria-hidden /></span>
                <span className="min-w-0"><span className="flex items-center gap-[0.5em] font-medium text-fg">{m.label}{on && <Badge tone="brand" dot={false}>Par défaut</Badge>}</span><span className="mt-[0.2em] block text-xs text-fg-muted">{m.detail}</span></span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="inv">
        <h2 id="inv" className="mb-[0.8em] text-h3 font-semibold text-fg">Factures</h2>
        <DataTable columns={columns} rows={INVOICES} onRowClick={setInvoice} defaultSort={{ key: "date", dir: "desc" }} pageSize={8} />
      </section>

      <Modal open={!!invoice} onClose={() => setInvoice(null)} size="lg" title={invoice ? `Facture ${invoice.id}` : ""} footer={<><Button variant="ghost" onClick={() => setInvoice(null)}>Fermer</Button><Button icon={Printer} onClick={() => { db.audit(user.employeeId, "Facture téléchargée", invoice.id, ""); printPage(); }}>Imprimer / Enregistrer en PDF</Button></>}>
        {invoice && <div className="overflow-x-auto rounded-lg bg-bg-sunken p-[1em]"><Paper className="min-w-[36em] text-[14px]"><InvoiceSheet invoice={invoice} company={company} /></Paper></div>}
      </Modal>
      {invoice && <PrintOnly><InvoiceSheet invoice={invoice} company={company} /></PrintOnly>}
      <UpgradeModal key={upgrade?.key ?? "none"} open={!!upgrade} onClose={() => setUpgrade(null)} target={upgrade} current={currentPlan.key} employees={active} actorId={user.employeeId} />
    </>
  );
}

export default function BillingView() {
  return <AccessGate roles={["admin"]}>{(user) => <Content user={user} />}</AccessGate>;
}
