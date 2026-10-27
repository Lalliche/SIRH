// Fictional but arithmetically real payslip: totals come from the payroll engine (gross 120 000 DA).
import { grossToNet } from "@/lib/payroll";

const GROSS = 120000;
const r = grossToNet(GROSS);

const earnings = [
  { key: "base", label: "Salaire de base", amount: 92000 },
  { key: "iep", label: "Indemnité d'expérience", amount: 8000 },
  { key: "rendement", label: "Prime de rendement", amount: 12000 },
  { key: "transport", label: "Transport et panier", amount: 8000 },
];

export const SAMPLE_PAYSLIP = {
  company: { name: "Tassili Industries SPA", place: "Zone industrielle de Rouïba, Alger" },
  employee: { name: "Nadia Bensaïd", matricule: "EMP-0147", job: "Responsable logistique", cnas: "16 0847 3921 55", initials: "NB" },
  period: "Octobre 2026",
  payDate: "31/10/2026",
  earnings,
  gross: r.gross,
  cnasRate: "9 %",
  cnasEmployee: r.cnasEmployee,
  irg: r.irg,
  deductions: r.cnasEmployee + r.irg,
  net: r.net,
  employerRate: "25 %",
  cnasEmployer: r.cnasEmployer,
  employerCost: r.employerCost,
};
