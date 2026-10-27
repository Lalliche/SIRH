export const VAT = 0.19;

export const PLANS = [
  { key: "Start", price: 39000, employees: 25, storage: "1 Go", features: ["Dossiers salariés et documents", "Congés et pointage", "Paie CNAS / IRG", "Support par e-mail"] },
  { key: "Business", price: 79000, employees: 100, storage: "5 Go", features: ["Tout Start", "Recrutement et formations", "Objectifs et pouls des équipes", "Déclarations G50 / DAS", "Support prioritaire"] },
  { key: "Enterprise", price: 149000, employees: 300, storage: "20 Go", features: ["Tout Business", "Multi-entités et sites", "Rôles et circuits sur mesure", "Connecteur pointeuse ZKTeco", "Chargé de compte dédié"] },
];

export const INVOICES = [
  { id: "FAC-2026-014", date: "2026-01-15", label: "Abonnement SIRH Business — 12 mois (2026)", ht: 79000, status: "paid", method: "Virement" },
  { id: "FAC-2025-009", date: "2025-01-14", label: "Abonnement SIRH Business — 12 mois (2025)", ht: 79000, status: "paid", method: "Virement" },
  { id: "FAC-2025-031", date: "2025-06-03", label: "Pack de 25 employés supplémentaires — au prorata", ht: 18500, status: "paid", method: "CCP" },
  { id: "FAC-2024-004", date: "2024-01-10", label: "Abonnement SIRH Start — 12 mois (2024)", ht: 39000, status: "paid", method: "Baridimob" },
];

export const METHODS = [
  { key: "virement", label: "Virement bancaire", detail: "RIB 00799999 0012 3456 78 · BNA Rouïba" },
  { key: "ccp", label: "CCP", detail: "Compte 0012345678 clé 42 · Algérie Poste" },
  { key: "baridimob", label: "Baridimob", detail: "Paiement mobile · 0555 12 34 56" },
];

export const ttc = (ht) => Math.round(ht * (1 + VAT));
