"use client";

import { toast } from "@/components/ui";
import { useCurrentUser } from "@/lib/use-current-user";
import { decideMany } from "./actions";

/** run([{kind,id}], "approve"|"reject", reason?) → writes db + audit + notify and shows an undo toast. */
export function useDecisions() {
  const me = useCurrentUser();
  return (entries, decision, reason = "") => {
    const res = decideMany(entries, decision, me, reason);
    if (!res.count) {
      toast.warning("Cette demande a déjà été traitée.");
      return null;
    }
    const show = decision === "approve" ? toast.success : toast.info;
    show(res.label, { duration: 7000, action: { label: "Annuler", onClick: () => { res.undo(); toast.info("Décision annulée."); } } });
    return res;
  };
}
