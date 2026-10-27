// Realistic Algerian demo data for the hero dashboard preview. Role-aware (Admin ⇄ Employé); DA amounts and
// names follow the house seed conventions (see src/data/seed.js), kept self-contained for the landing page.

export const VIEWS = {
  admin: {
    label: "Admin",
    subtitle: "Octobre 2026 · 4 sites",
    identity: { name: "Karim Benali", role: "Directeur général" },
    kpis: {
      paie: [
        { label: "Effectif actif", value: 49, hint: "+2 ce mois" },
        { label: "Masse salariale brute", value: 5205830, suffix: " DA", hint: "+0,6 % vs sept." },
        { label: "Coût employeur", value: 6533318, suffix: " DA", hint: "charges 25,5 %" },
        { label: "Net à payer", value: 3694125, suffix: " DA", hint: "49 bulletins" },
      ],
      conges: [
        { label: "Congés en attente", value: 6, hint: "à traiter" },
        { label: "Absents cette semaine", value: 4, hint: "dont 2 maladie" },
        { label: "Taux d'absentéisme", value: 4.6, suffix: " %", hint: "hors congé annuel" },
        { label: "Jours posés en nov.", value: 38, hint: "sur l'entreprise" },
      ],
      pointage: [
        { label: "Présents aujourd'hui", value: 44, hint: "sur 49" },
        { label: "Retards", value: 2, hint: "ce matin" },
        { label: "Heures sup. du mois", value: 11, suffix: " h", hint: "0 % du seuil légal" },
        { label: "Heures moyennes", value: 8.2, suffix: " h", hint: "par jour travaillé" },
      ],
    },
  },
  employee: {
    label: "Employé",
    subtitle: "Mon espace · Nadia Saadi",
    identity: { name: "Nadia Saadi", role: "Comptable · Finance" },
    kpis: {
      paie: [
        { label: "Dernier net", value: 86540, suffix: " DA", hint: "septembre 2026" },
        { label: "Cumul net 2026", value: 692320, suffix: " DA", hint: "9 bulletins" },
        { label: "Retenue CNAS", value: 10800, suffix: " DA", hint: "9 % du brut" },
        { label: "IRG du mois", value: 22660, suffix: " DA", hint: "barème 2026" },
      ],
      conges: [
        { label: "Solde congés", value: 14, hint: "sur 30 jours" },
        { label: "Jours pris", value: 16, hint: "depuis janvier" },
        { label: "Demandes", value: 1, hint: "en attente" },
        { label: "Prochaine absence", value: 9, suffix: " nov.", hint: "congé annuel" },
      ],
      pointage: [
        { label: "Heures ce mois", value: 164, suffix: " h", hint: "sur 173,33 h" },
        { label: "Heures sup.", value: 11, suffix: " h", hint: "payées à +50 %" },
        { label: "Retards", value: 1, hint: "ce mois" },
        { label: "Jours travaillés", value: 20, hint: "sur 21" },
      ],
    },
  },
};

export const STEPS = [
  { label: "Variables", state: "done" },
  { label: "Calcul", state: "done" },
  { label: "Validation", state: "current" },
  { label: "Paiement", state: "todo" },
  { label: "G50 / DAS", state: "todo" },
];

// The pre-flight "necessity" micro-story: an error the engine catches before anyone signs off on it.
export const PREFLIGHT = {
  row: { label: "Walid Cherif · Production", detail: "Écart +1 j heures sup. non validées" },
  action: "Vérifier",
};

// A few payslip lines so the Paie tab reads like a real run, not three summary tiles.
export const PAYROLL_LINES = [
  { name: "Amina Haddad", job: "Responsable RH", gross: 198400, cnas: 17856, irg: 46120, net: 134424 },
  { name: "Yacine Merabet", job: "Directeur production", gross: 224000, cnas: 20160, irg: 53480, net: 150360 },
  { name: "Walid Cherif", job: "Chef d'équipe", gross: 112500, cnas: 10125, irg: 20475, net: 81900 },
  { name: "Sofiane Mansouri", job: "Opérateur", gross: 56200, cnas: 5058, irg: 5712, net: 45430 },
];

export const PAYROLL_TOTALS = { gross: 5205830, cnas: 468525, irg: 1043180, net: 3694125 };

export const LEAVE_CALENDAR = {
  weekdays: ["D", "L", "M", "M", "J", "V", "S"],
  days: [25, 26, 27, 28, 29, 30, 31, 1, 2, 3, 4, 5, 6, 7],
  today: 27,
  absent: new Set([28, 29, 2, 3]),
};

export const LEAVE_REQUESTS = [
  { name: "Sofiane Mansouri", type: "Congé annuel", range: "9 → 19 nov.", days: "9 j", tone: "warning" },
  { name: "Karim Kendil", type: "Congé annuel", range: "15 → 26 nov.", days: "8 j", tone: "warning" },
  { name: "Ines Belkacem", type: "Maladie · CNAS", range: "1 → 7 oct.", days: "5 j", tone: "success" },
];

export const LEAVE_BALANCES = [
  { label: "Congé annuel", used: 16, total: 30 },
  { label: "Récupération", used: 2, total: 5 },
];

export const ATTENDANCE_COST = [
  { label: "Prod.", value: 92 },
  { label: "Fin.", value: 54 },
  { label: "Com.", value: 61 },
  { label: "SI", value: 47 },
  { label: "Log.", value: 38 },
  { label: "RH", value: 33 },
];

export const ATTENDANCE_TODAY = { present: 44, late: 2, absent: 3, ring: 90 };

export const ATTENDANCE_ROWS = [
  { name: "Sara Mansouri", in: "07:52", out: "17:04", status: "Présent", tone: "success" },
  { name: "Nadia Saadi", in: "08:21", out: "17:10", status: "Retard", tone: "warning" },
  { name: "Riad Toumi", in: "—", out: "—", status: "Congé", tone: "brand" },
];
