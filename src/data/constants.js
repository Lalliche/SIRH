// Static reference data shared by modules (no persistence needed).

export const ROLES = {
  admin: { label: "Directeur général", short: "Admin" },
  hr: { label: "Responsable RH", short: "RH" },
  manager: { label: "Chef de service", short: "Manager" },
  accountant: { label: "Comptable paie", short: "Comptable" },
  employee: { label: "Employé", short: "Employé" },
};

export const LEAVE_TYPES = {
  annual: { label: "Congé annuel", color: "var(--chart-4)", paid: true },
  sick: { label: "Maladie", color: "var(--chart-5)", paid: true },
  maternity: { label: "Maternité / paternité", color: "var(--chart-3)", paid: true },
  unpaid: { label: "Sans solde", color: "var(--chart-7)", paid: false },
  exceptional: { label: "Exceptionnel", color: "var(--chart-6)", paid: true },
  recovery: { label: "Récupération", color: "var(--chart-1)", paid: true },
  pilgrimage: { label: "Pèlerinage", color: "var(--chart-8)", paid: true },
};

export const LEAVE_STATUS = {
  pending: { label: "En attente", tone: "warning" },
  approved: { label: "Approuvé", tone: "success" },
  rejected: { label: "Refusé", tone: "danger" },
  cancelled: { label: "Annulé", tone: "neutral" },
  taken: { label: "Pris", tone: "brand" },
};

export const PAYROLL_STATUS = {
  draft: { label: "Brouillon", tone: "neutral" },
  computed: { label: "Calculée", tone: "info" },
  validated: { label: "Validée", tone: "brand" },
  paid: { label: "Payée", tone: "success" },
  declared: { label: "Déclarée", tone: "success" },
  error: { label: "En erreur", tone: "danger" },
  closed: { label: "Clôturée", tone: "neutral" },
};

export const ATTENDANCE_STATUS = {
  present: { label: "Présent", tone: "success" },
  late: { label: "Retard", tone: "warning" },
  absent: { label: "Absent", tone: "danger" },
  remote: { label: "Télétravail", tone: "info" },
  mission: { label: "Mission", tone: "plum" },
  leave: { label: "En congé", tone: "brand" },
  holiday: { label: "Jour férié", tone: "neutral" },
  pending: { label: "En attente", tone: "neutral" },
};

export const REQUEST_KINDS = {
  attestation_travail: "Attestation de travail",
  attestation_salaire: "Attestation de salaire",
  avance: "Avance sur salaire",
  changement_info: "Changement d'informations",
  materiel: "Demande de matériel",
  autre: "Autre demande",
};

export const CONTRACT_TYPES = {
  CDI: "CDI",
  CDD: "CDD",
  ANEM: "Contrat ANEM",
  STAGE: "Stage",
  TEMPS_PARTIEL: "Temps partiel",
};

export const WILAYAS = [
  "Alger", "Oran", "Constantine", "Annaba", "Blida", "Sétif", "Tizi Ouzou", "Béjaïa", "Batna", "Tlemcen",
  "Biskra", "Ouargla", "Ghardaïa", "Mostaganem", "Boumerdès", "Tipaza", "Médéa", "Skikda",
];

// 8 pre-defined demo personas (one per role) — resolved against seeded employees by id
export const PERSONAS = [
  { role: "admin", employeeId: "emp-001", blurb: "Pilotez l'entreprise : masse salariale, conformité, validation de la paie." },
  { role: "hr", employeeId: "emp-002", blurb: "Gérez dossiers, congés, recrutement et lancez la paie du mois." },
  { role: "manager", employeeId: "emp-004", blurb: "Approuvez les demandes de votre équipe et suivez les présences." },
  { role: "accountant", employeeId: "emp-003", blurb: "Préparez la paie, contrôlez les écarts et générez les déclarations." },
  { role: "employee", employeeId: "emp-012", blurb: "Consultez vos bulletins, posez un congé, faites une demande." },
];
