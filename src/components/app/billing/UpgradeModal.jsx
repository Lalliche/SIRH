"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button, Modal, Segmented, toast } from "@/components/ui";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { PLANS, VAT } from "./data";

export default function UpgradeModal({ open, onClose, target, current, employees, actorId }) {
  const [cycle, setCycle] = useState("annual");
  if (!target) return null;
  const monthly = Math.round((target.price * 1.15) / 12);
  const price = cycle === "annual" ? target.price : monthly;
  const downgrade = PLANS.findIndex((p) => p.key === target.key) < PLANS.findIndex((p) => p.key === current);
  const tooSmall = employees > target.employees;

  const confirm = () => {
    db.update("settings", (s) => ({ ...s, billing: { ...(s.billing ?? {}), requestedPlan: target.key, cycle } }));
    db.audit(actorId, downgrade ? "Changement d'offre demandé" : "Mise à niveau demandée", `Offre ${target.key}`, cycle === "annual" ? "Annuel" : "Mensuel");
    toast.success(`Demande envoyée : un conseiller vous confirme le passage à ${target.key} sous 24 h.`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" title={`${downgrade ? "Passer à" : "Mettre à niveau vers"} ${target.key}`} description="Simulation : aucun paiement n'est effectué."
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button disabled={tooSmall} onClick={confirm}>Confirmer la demande</Button></>}>
      <div className="flex flex-col gap-[1.2em]">
        <Segmented value={cycle} onChange={setCycle} options={[{ value: "annual", label: "Annuel" }, { value: "monthly", label: "Mensuel" }]} />
        <p><span className="font-display text-kpi font-semibold text-fg num">{money(price, { decimals: 0 })}</span> <span className="text-fg-muted">HT / {cycle === "annual" ? "an" : "mois"}</span></p>
        <p className="text-xs text-fg-muted">TVA {Math.round(VAT * 100)} % en sus. Le tarif mensuel inclut une majoration de 15 %.</p>
        {tooSmall && <p role="alert" className="rounded-md bg-danger-bg p-[0.8em] text-sm text-danger-fg">Cette offre est limitée à {target.employees} employés : vous en avez {employees}.</p>}
        <ul className="flex flex-col gap-[0.4em]">
          {target.features.map((f) => <li key={f} className="flex items-start gap-[0.6em] text-sm text-fg-secondary"><Check className="mt-[0.2em] size-[1.1em] shrink-0 text-success-fg" aria-hidden />{f}</li>)}
        </ul>
      </div>
    </Modal>
  );
}
