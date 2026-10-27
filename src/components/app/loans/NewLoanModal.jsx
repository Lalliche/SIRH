"use client";

import { useState } from "react";
import { AlertTriangle, HandCoins } from "lucide-react";
import { Badge, Button, Checkbox, Modal, Progress, SelectInput, TextArea, TextInput, toast } from "@/components/ui";
import { shiftPeriod } from "@/components/app/leave/leave-utils";
import { useDirectory } from "@/components/app/leave/use-directory";
import { CURRENT_PERIOD, TODAY } from "@/lib/clock";
import { db, newId, useCollection } from "@/lib/db";
import { fullName, money, periodLabel } from "@/lib/format";
import { can } from "@/lib/session";
import { useCurrentUser } from "@/lib/use-current-user";
import { cn } from "@/lib/utils";
import { LOAN_TYPES, MAX_SOCIAL_MULTIPLE, capacity, lastInstallment, monthsFor } from "./loan-utils";

const m0 = (v) => money(v, { decimals: 0 });
const toInt = (s) => parseInt(String(s).replace(/\s/g, ""), 10) || 0;
const DURATIONS = [3, 6, 12, 24, 36];

export default function NewLoanModal({ open, onClose }) {
  const me = useCurrentUser();
  const dir = useDirectory();
  const loans = useCollection("loans");
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState("avance");
  const [total, setTotal] = useState("");
  const [monthly, setMonthly] = useState("");
  const [start, setStart] = useState(shiftPeriod(CURRENT_PERIOD, 1));
  const [reason, setReason] = useState("");
  const [direct, setDirect] = useState(true);
  const [touched, setTouched] = useState(false);

  const emp = dir.byId[employeeId];
  const totalN = toInt(total);
  const monthlyN = toInt(monthly);
  const n = monthsFor(totalN, monthlyN);
  const cap = emp && monthlyN ? capacity(emp, loans, monthlyN) : null;
  const salaries = can(me.role, "salaries");
  const minMonthly = cap && cap.room > 0 && totalN ? Math.ceil(totalN / Math.floor(cap.room) / 100) * 100 : null;

  const errors = {};
  if (!employeeId) errors.employee = "Choisissez un salarié.";
  if (totalN < 5000) errors.total = "Montant minimum : 5 000 DA.";
  if (!monthlyN) errors.monthly = "Indiquez la mensualité ou choisissez une durée.";
  else if (monthlyN > totalN) errors.monthly = "La mensualité ne peut pas dépasser le montant total.";
  else if (cap && !cap.ok) errors.monthly = `Au-delà du tiers du net (plafond ${m0(Math.floor(cap.room))} de mensualité disponible).`;
  const warnings = [];
  if (cap && totalN) {
    if (type === "avance" && totalN > cap.net) warnings.push("Une avance dépasse en principe un mois de net.");
    if (type === "pret_social" && totalN > cap.net * MAX_SOCIAL_MULTIPLE) warnings.push(`Un prêt social dépasse ${MAX_SOCIAL_MULTIPLE} mois de net [à confirmer].`);
  }

  const reset = () => { setEmployeeId(""); setType("avance"); setTotal(""); setMonthly(""); setStart(shiftPeriod(CURRENT_PERIOD, 1)); setReason(""); setDirect(true); setTouched(false); };
  const close = () => { reset(); onClose(); };
  const setDuration = (d) => totalN && setMonthly(String(Math.ceil(totalN / d / 100) * 100));

  const submit = () => {
    setTouched(true);
    if (Object.keys(errors).length) return;
    const loan = {
      id: newId("ln"), employeeId, type, total: totalN, monthly: monthlyN, remaining: totalN,
      status: direct ? "active" : "pending", startDate: `${start}-01`, reason: reason.trim(), requestedAt: TODAY,
      ...(direct ? { approvedBy: me.employeeId, disbursedAt: TODAY } : {}),
    };
    db.insert("loans", loan, { prepend: true });
    db.audit(me.employeeId, direct ? "Prêt accordé" : "Prêt créé (en attente)", fullName(emp), `${LOAN_TYPES[type].short} ${m0(totalN)} · ${m0(monthlyN)}/mois`);
    if (direct) db.notify({ title: "Un prêt vous a été accordé", body: `${m0(totalN)}, remboursé à ${m0(monthlyN)} par mois.`, href: "/app/requests", employeeId, roles: ["admin", "hr", "manager", "accountant", "employee"] });
    toast.success(direct ? `${LOAN_TYPES[type].short} accordé à ${emp.firstName}` : "Prêt enregistré, en attente d'approbation", { action: { label: "Annuler", onClick: () => db.remove("loans", loan.id) } });
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Nouveau prêt ou avance"
      description="Le remboursement est prélevé automatiquement sur la paie, sans dépasser un tiers du net."
      footer={<><Button variant="ghost" onClick={close}>Annuler</Button><Button icon={HandCoins} onClick={submit}>{direct ? "Accorder le prêt" : "Enregistrer"}</Button></>}
    >
      <div className="grid gap-[1.5em] md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="flex flex-col gap-[1em]">
          <SelectInput label="Salarié" required value={employeeId} onChange={setEmployeeId} placeholder="Choisir un salarié" error={touched ? errors.employee : undefined} options={dir.employees.filter((e) => e.status !== "sorti").map((e) => ({ value: e.id, label: `${fullName(e)} · ${e.matricule}` }))} />
          <SelectInput label="Type" value={type} onChange={setType} options={Object.entries(LOAN_TYPES).map(([value, t]) => ({ value, label: t.label }))} />
          <TextInput label="Montant total" required inputMode="numeric" suffix="DA" value={total} onChange={setTotal} error={touched ? errors.total : undefined} />
          <div>
            <TextInput label="Mensualité" required inputMode="numeric" suffix="DA" value={monthly} onChange={setMonthly} error={touched ? errors.monthly : undefined} />
            <div className="mt-[0.5em] flex flex-wrap items-center gap-[0.4em]" aria-label="Durées proposées">
              <span className="text-xs text-fg-muted">Durée :</span>
              {DURATIONS.map((d) => <Button key={d} size="sm" variant={n === d ? "soft" : "secondary"} disabled={!totalN} onClick={() => setDuration(d)}>{d} mois</Button>)}
            </div>
          </div>
          <SelectInput label="Première retenue" value={start} onChange={setStart} options={[1, 2, 3].map((i) => { const p = shiftPeriod(CURRENT_PERIOD, i); return { value: p, label: periodLabel(p) }; })} />
          <TextArea label="Motif" rows={2} value={reason} onChange={setReason} placeholder="Ex. : frais de scolarité, urgence médicale." />
          <Checkbox checked={direct} onChange={setDirect} label="Approuver immédiatement" />
        </div>

        <aside aria-live="polite" className="flex flex-col gap-[1em] rounded-lg border border-border bg-surface-2 p-[1.1em]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Échéancier</p>
            {n > 0 && totalN ? (
              <>
                <p className="mt-[0.3em] font-display text-kpi font-semibold text-fg num">{n}<span className="ms-[0.3em] text-base font-medium text-fg-secondary">mensualités</span></p>
                <dl className="mt-[0.4em] flex flex-col gap-[0.25em] text-sm">
                  <div className="flex justify-between"><dt className="text-fg-muted">Mensualité</dt><dd className="font-medium text-fg num">{m0(monthlyN)}</dd></div>
                  <div className="flex justify-between"><dt className="text-fg-muted">Dernière mensualité</dt><dd className="font-medium text-fg num">{m0(lastInstallment(totalN, monthlyN))}</dd></div>
                  <div className="flex justify-between"><dt className="text-fg-muted">Fin des retenues</dt><dd className="font-medium capitalize text-fg">{periodLabel(shiftPeriod(start, n - 1))}</dd></div>
                </dl>
              </>
            ) : (
              <p className="mt-[0.3em] text-sm text-fg-muted">Saisissez le montant et la mensualité (ou une durée) pour voir l’échéancier.</p>
            )}
          </div>

          <div className="border-t border-border-subtle pt-[0.9em]">
            <p className="mb-[0.5em] flex items-center gap-[0.5em] text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Règle : mensualité ≤ 1/3 du net <Badge tone="warning">à confirmer</Badge></p>
            {!emp ? (
              <p className="text-sm text-fg-muted">Choisissez un salarié pour vérifier sa capacité.</p>
            ) : cap ? (
              <>
                <Progress value={cap.total} max={cap.cap} tone={cap.ok ? "primary" : "danger"} />
                <p className={cn("mt-[0.5em] text-sm", cap.ok ? "text-fg-secondary" : "text-danger-fg")}>
                  {salaries ? <>Retenues cumulées <strong className="font-medium num">{m0(cap.total)}</strong> sur un plafond de <strong className="font-medium num">{m0(cap.cap)}</strong>{cap.existing > 0 && <> (dont {m0(cap.existing)} déjà en cours)</>}.</> : cap.ok ? "Dans la limite autorisée." : "Au-delà de la limite autorisée."}
                </p>
                {!cap.ok && minMonthly && <Button className="mt-[0.5em]" size="sm" variant="soft" onClick={() => setMonthly(String(Math.floor(cap.room / 100) * 100))}>Appliquer la mensualité maximale ({m0(Math.floor(cap.room / 100) * 100)})</Button>}
              </>
            ) : (
              <p className="text-sm text-fg-secondary">{salaries ? `Plafond mensuel : ${m0(Math.floor((emp ? capacity(emp, loans, 0).room : 0)))} disponibles pour ${emp.firstName}.` : "Saisissez une mensualité."}</p>
            )}
          </div>

          {warnings.map((w) => <p key={w} className="flex items-start gap-[0.5em] rounded-md bg-warning-bg px-[0.8em] py-[0.55em] text-sm text-warning-fg"><AlertTriangle className="mt-[0.15em] size-[1.1em] shrink-0" aria-hidden />{w}</p>)}
        </aside>
      </div>
    </Modal>
  );
}
