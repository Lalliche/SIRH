"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button, Modal, TextArea, TextInput, toast } from "@/components/ui";
import { dateLong, fullName } from "@/lib/format";
import { useCurrentUser } from "@/lib/use-current-user";
import { requestCorrection, saveTimes } from "./attendance-actions";

/**
 * target: { employee, date, record } | null.
 * mode "request" → creates a pending correction for the manager; "direct" → manager/HR edits with a reason (audited).
 * Mount with key={...} so the form re-initialises for each target.
 */
export default function CorrectionModal({ target, mode, onClose }) {
  const me = useCurrentUser();
  const [inT, setIn] = useState(target?.record?.in ?? "");
  const [outT, setOut] = useState(target?.record?.out ?? "");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const direct = mode === "direct";

  const errors = {};
  if (!inT && !outT) errors.time = "Renseignez au moins une heure.";
  if (inT && outT && outT <= inT) errors.time = "La sortie doit suivre l'entrée.";
  if (!reason.trim()) errors.reason = "Le motif est obligatoire : il est conservé dans le journal d'audit.";

  const submit = () => {
    setTouched(true);
    if (Object.keys(errors).length) return;
    if (direct) {
      const undo = saveTimes({ employeeId: target.employee.id, date: target.date, inT, outT }, me);
      toast.success("Pointage corrigé", { action: { label: "Annuler", onClick: undo } });
    } else {
      requestCorrection({ employeeId: target.employee.id, date: target.date, inT, outT, reason: reason.trim() }, me);
      toast.success("Correction envoyée à votre responsable");
    }
    onClose();
  };

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      size="sm"
      title={direct ? "Corriger le pointage" : "Demander une correction"}
      description={target ? `${fullName(target.employee)} · ${dateLong(target.date)}` : ""}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button icon={direct ? undefined : Send} onClick={submit}>{direct ? "Enregistrer" : "Envoyer"}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-[1em]">
        <div className="grid grid-cols-2 gap-[0.75em]">
          <TextInput label="Entrée" type="time" value={inT} onChange={setIn} />
          <TextInput label="Sortie" type="time" value={outT} onChange={setOut} />
        </div>
        {touched && errors.time && <p role="alert" className="text-[0.8125em] text-danger-fg">{errors.time}</p>}
        <TextArea label="Motif" required rows={3} value={reason} onChange={setReason} error={touched ? errors.reason : undefined} placeholder="Ex. : terminal hors ligne, badge oublié, mission extérieure…" />
        {!direct && <p className="text-xs text-fg-muted">Votre responsable recevra la demande dans ses approbations.</p>}
      </div>
    </Modal>
  );
}
