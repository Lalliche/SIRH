import { db } from "@/lib/db";
import { TODAY } from "@/lib/clock";

// Wizard drafts live in the db under `payrollDrafts` (created on first write — not part of the seed).
export const draftId = (period) => `draft-${period}`;

export const draftOps = {
  save(draft) {
    db.update("payrollDrafts", (list = []) =>
      list.some((d) => d.id === draft.id) ? list.map((d) => (d.id === draft.id ? draft : d)) : [...list, draft],
    );
  },
  patch(id, patch) {
    db.update("payrollDrafts", (list = []) => list.map((d) => (d.id === id ? { ...d, ...(typeof patch === "function" ? patch(d) : patch), updatedAt: TODAY } : d)));
  },
  remove(id) {
    db.update("payrollDrafts", (list = []) => list.filter((d) => d.id !== id));
  },
};

export const WIZARD_STEPS = [
  { n: 1, key: "period", label: "Période", long: "Période et périmètre" },
  { n: 2, key: "variables", label: "Variables", long: "Variables du mois" },
  { n: 3, key: "calc", label: "Calcul", long: "Calcul des bulletins" },
  { n: 4, key: "checks", label: "Contrôles", long: "Contrôles préalables et écarts" },
  { n: 5, key: "validate", label: "Validation", long: "Validation de la paie" },
  { n: 6, key: "pay", label: "Paiement", long: "Paiement et déclarations" },
];
