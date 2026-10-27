import { defaultParams } from "@/lib/payroll";
import { date, money } from "@/lib/format";

// Landing › Trust strip. No client logos until real, approved ones exist: the strip shows legal vocabulary.
// [VERIFY] rates and dates are secondary-sourced; they come from src/lib/payroll.js defaultParams (one place to fix).
export const trust = {
  label: "Le vocabulaire de la paie algérienne, nativement",
  updated: `Paramètres à jour au ${date(defaultParams.effectiveFrom)}`,
  updatedNote: "À confirmer à chaque Loi de finances",
  chips: [
    { code: "CNAS", label: "Caisse nationale des assurances sociales" },
    { code: "CASNOS", label: "Caisse des non-salariés" },
    { code: "IRG", label: "Impôt sur le revenu global" },
    { code: "DAS", label: "Déclaration annuelle des salaires" },
    { code: "G50", label: "Déclaration fiscale mensuelle" },
    { code: "SNMG", label: "Salaire minimum", value: money(defaultParams.snmg, { decimals: 0 }) },
    { code: "Loi 90-11", label: "Relations de travail" },
    { code: "FNPOS", label: "Œuvres sociales" },
  ],
};
