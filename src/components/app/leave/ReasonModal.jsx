"use client";

import { useState } from "react";
import { Button, Modal, TextArea } from "@/components/ui";

const DEFAULT_PRESETS = ["Période de forte activité", "Dossier incomplet", "Solde insuffisant", "Doublon d'une demande existante"];

/** Reject-with-reason dialog. onConfirm(reason) — the reason is mandatory. */
export default function ReasonModal({ open, onClose, onConfirm, title = "Refuser la demande", description, presets = DEFAULT_PRESETS, confirmLabel = "Refuser" }) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const error = touched && !reason.trim() ? "Indiquez un motif : il sera transmis au salarié." : undefined;

  const close = () => { setReason(""); setTouched(false); onClose(); };
  const confirm = () => {
    if (!reason.trim()) return setTouched(true);
    onConfirm(reason.trim());
    setReason("");
    setTouched(false);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Annuler</Button>
          <Button variant="danger-solid" onClick={confirm}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-[0.9em]">
        <TextArea label="Motif du refus" required rows={3} value={reason} onChange={setReason} error={error} placeholder="Ex. : effectif minimum non assuré sur la ligne 02." />
        <div className="flex flex-wrap gap-[0.4em]" aria-label="Motifs fréquents">
          {presets.map((p) => (
            <Button key={p} variant="soft" size="sm" onClick={() => setReason(p)}>{p}</Button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
