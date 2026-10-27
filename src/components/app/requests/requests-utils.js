// Request catalogue: kinds, SLA, display details. Pure.
import { FileSignature, FileText, HandCoins, Laptop, MessageSquare, UserCog } from "lucide-react";
import { REQUEST_KINDS } from "@/data/constants";
import { TODAY } from "@/lib/clock";
import { diffDays } from "@/lib/dates";
import { money } from "@/lib/format";

export const REQUEST_META = {
  attestation_travail: { icon: FileText, desc: "Prouve votre emploi : banque, administration, location.", sla: 2, doc: true },
  attestation_salaire: { icon: FileSignature, desc: "Indique votre rémunération : crédit, visa, dossier.", sla: 2, doc: true },
  avance: { icon: HandCoins, desc: "Acompte remboursé en retenues sur vos prochaines paies.", sla: 3 },
  changement_info: { icon: UserCog, desc: "Adresse, RIB, situation familiale, téléphone.", sla: 5 },
  materiel: { icon: Laptop, desc: "Équipement de protection, informatique, fournitures.", sla: 5 },
  autre: { icon: MessageSquare, desc: "Toute autre demande adressée aux RH.", sla: 5 },
};

export const REQUEST_STATUS = {
  pending: { label: "En attente", tone: "warning" },
  approved: { label: "Approuvée", tone: "success" },
  rejected: { label: "Refusée", tone: "danger" },
};

export const isDoc = (kind) => !!REQUEST_META[kind]?.doc;
export const kindLabel = (kind) => REQUEST_KINDS[kind] ?? kind;

/** SLA state of a pending request. */
export function slaOf(r) {
  const sla = REQUEST_META[r.kind]?.sla ?? 5;
  const age = diffDays(r.createdAt, TODAY);
  return { sla, age, late: r.status === "pending" && age > sla, left: sla - age };
}

/** Label/value pairs shown under a request. */
export function requestDetails(r) {
  const out = [];
  if (r.kind === "avance" && r.amount) out.push(["Montant", money(r.amount, { decimals: 0 })], ["Remboursement", `${r.months || 6} mois`]);
  if (r.kind === "changement_info" && r.field) out.push(["Information à modifier", r.field]);
  if (r.kind === "materiel" && r.item) out.push(["Matériel", r.item]);
  if (r.docRef) out.push(["Référence", r.docRef]);
  return out;
}
