"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { Button, Modal, SelectInput, TextArea, TextInput, toast } from "@/components/ui";
import { capacity } from "@/components/app/loans/loan-utils";
import { REQUEST_KINDS } from "@/data/constants";
import { TODAY } from "@/lib/clock";
import { db, newId, useCollection } from "@/lib/db";
import { fullName, money } from "@/lib/format";
import { useCurrentUser } from "@/lib/use-current-user";
import { cn } from "@/lib/utils";
import { REQUEST_META } from "./requests-utils";

const FIELDS = ["Adresse", "RIB bancaire", "Situation familiale", "Numéro de téléphone", "Autre"];
const MONTHS = ["3", "6", "9", "12"];

/** Typed request form: pick a kind, fill the few fields it needs. */
export default function NewRequestModal({ open, onClose, initialKind = "attestation_travail" }) {
  const me = useCurrentUser();
  const loans = useCollection("loans");
  const [kind, setKind] = useState(null);
  const [note, setNote] = useState("");
  const [amountV, setAmountV] = useState("");
  const [months, setMonths] = useState("6");
  const [field, setField] = useState(FIELDS[0]);
  const [item, setItem] = useState("");
  const [touched, setTouched] = useState(false);

  const k = kind ?? initialKind;
  const amt = parseInt(amountV.replace(/\s/g, ""), 10) || 0;
  const monthly = amt ? Math.ceil(amt / Number(months) / 100) * 100 : 0;
  const cap = useMemo(() => (k === "avance" && monthly ? capacity(me.employee, loans, monthly) : null), [k, monthly, me.employee, loans]);

  const errors = {};
  if (k === "avance" && amt < 5000) errors.amount = "Indiquez un montant d'au moins 5 000 DA.";
  if (k === "materiel" && !item.trim()) errors.item = "Précisez le matériel demandé.";
  if ((k === "autre" || k === "changement_info") && !note.trim()) errors.note = "Précisez votre demande.";

  const reset = () => { setKind(null); setNote(""); setAmountV(""); setMonths("6"); setField(FIELDS[0]); setItem(""); setTouched(false); };
  const close = () => { reset(); onClose(); };

  const submit = () => {
    setTouched(true);
    if (Object.keys(errors).length) return;
    const req = {
      id: newId("rq"), employeeId: me.employeeId, kind: k, status: "pending", note: note.trim(), createdAt: TODAY,
      ...(k === "avance" ? { amount: amt, months: Number(months) } : {}),
      ...(k === "changement_info" ? { field } : {}),
      ...(k === "materiel" ? { item: item.trim() } : {}),
    };
    db.insert("requests", req, { prepend: true });
    db.audit(me.employeeId, "Demande créée", fullName(me.employee), REQUEST_KINDS[k]);
    db.notify({ title: "Nouvelle demande", body: `${fullName(me.employee)} · ${REQUEST_KINDS[k]}`, href: "/app/inbox", roles: ["admin", "hr"] });
    toast.success("Demande envoyée aux RH", { action: { label: "Annuler", onClick: () => { db.remove("requests", req.id); } } });
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Nouvelle demande"
      description="Choisissez le type de demande. Les RH répondent selon le délai indiqué."
      footer={<><Button variant="ghost" onClick={close}>Annuler</Button><Button icon={Send} onClick={submit}>Envoyer la demande</Button></>}
    >
      <div className="flex flex-col gap-[1.1em]">
        <div role="radiogroup" aria-label="Type de demande" className="grid gap-[0.5em] sm:grid-cols-2">
          {Object.entries(REQUEST_META).map(([key, m]) => {
            const Icon = m.icon;
            const on = key === k;
            return (
              <Button
                key={key}
                variant={on ? "soft" : "secondary"}
                role="radio"
                aria-checked={on}
                onClick={() => setKind(key)}
                className={cn("!h-auto items-start justify-start gap-[0.7em] whitespace-normal !py-[0.7em] text-start", on && "ring-2 ring-ring")}
              >
                <Icon className="mt-[0.15em] size-[1.3em] shrink-0" aria-hidden strokeWidth={1.5} />
                <span className="flex flex-col">
                  <span className="font-medium">{REQUEST_KINDS[key]}</span>
                  <span className="text-[0.85em] font-normal text-fg-muted">{m.desc}</span>
                </span>
              </Button>
            );
          })}
        </div>

        {k === "avance" && (
          <div className="grid gap-[0.75em] sm:grid-cols-2">
            <TextInput label="Montant demandé" required inputMode="numeric" suffix="DA" value={amountV} onChange={setAmountV} error={touched ? errors.amount : undefined} />
            <SelectInput label="Remboursement" value={months} onChange={setMonths} options={MONTHS.map((m) => ({ value: m, label: `${m} mois` }))} />
            {monthly > 0 && (
              <p className={cn("sm:col-span-2 rounded-md px-[0.9em] py-[0.6em] text-sm", cap && !cap.ok ? "bg-warning-bg text-warning-fg" : "bg-primary-soft text-fg-secondary")}>
                Retenue estimée : <strong className="font-medium text-fg num">{money(monthly, { decimals: 0 })}</strong> par mois.
                {cap && !cap.ok ? " Elle dépasse le tiers de votre net : les RH pourront proposer un étalement plus long." : " Dans la limite d'un tiers du net."}
              </p>
            )}
          </div>
        )}
        {k === "changement_info" && <SelectInput label="Information à modifier" value={field} onChange={setField} options={FIELDS} />}
        {k === "materiel" && <TextInput label="Matériel souhaité" required value={item} onChange={setItem} placeholder="Ex. : chaussures de sécurité, pointure 42" error={touched ? errors.item : undefined} />}
        <TextArea
          label={k.startsWith("attestation") ? "Motif (facultatif)" : "Précisions"}
          required={k === "autre" || k === "changement_info"}
          rows={3}
          value={note}
          onChange={setNote}
          error={touched ? errors.note : undefined}
          placeholder={k.startsWith("attestation") ? "Ex. : dossier bancaire, demande de visa…" : "Détaillez votre demande."}
          hint={k === "changement_info" ? "Indiquez la nouvelle valeur. Un justificatif pourra vous être demandé." : undefined}
        />
      </div>
    </Modal>
  );
}
