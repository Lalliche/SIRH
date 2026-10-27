import { mulberry32, pick, between } from "@/lib/rng";
import { computePayslip, defaultParams } from "@/lib/payroll";
import { addDays, isWeekend, holidayOn, workingDays, listDays } from "@/lib/dates";
import { TODAY } from "@/lib/clock";

export const SEED_VERSION = 3;

const rnd = mulberry32(20261027);

// ---------- reference structure ----------
const company = {
  id: "co-1",
  name: "Tassili Industries SPA",
  legalForm: "SPA",
  nif: "000916019876543",
  nis: "000916010012345",
  rc: "16/00-0987654 B 09",
  cnasEmployerNo: "16 123456 78",
  address: "Zone industrielle de Rouïba, Alger",
  phone: "+213 23 85 00 00",
  email: "rh@tassili-industries.dz",
  sector: "Agroalimentaire",
  plan: "Business",
  workWeek: "Dim–Jeu",
};

const entities = [
  { id: "ent-1", name: "Siège — Hydra", city: "Alger", wilaya: "Alger", isHQ: true },
  { id: "ent-2", name: "Usine de Rouïba", city: "Rouïba", wilaya: "Alger", isHQ: false },
  { id: "ent-3", name: "Agence Oran", city: "Oran", wilaya: "Oran", isHQ: false },
  { id: "ent-4", name: "Plateforme Sétif", city: "Sétif", wilaya: "Sétif", isHQ: false },
];

const departments = [
  { id: "dep-dir", name: "Direction générale", description: "Pilotage et stratégie" },
  { id: "dep-rh", name: "Ressources humaines", description: "Administration du personnel et paie" },
  { id: "dep-fin", name: "Finance & comptabilité", description: "Comptabilité, trésorerie, reporting" },
  { id: "dep-prod", name: "Production", description: "Lignes de production 01 et 02" },
  { id: "dep-com", name: "Commercial", description: "Ventes, grands comptes, export" },
  { id: "dep-it", name: "Systèmes d'information", description: "Infrastructure, applications, support" },
  { id: "dep-log", name: "Logistique", description: "Stocks, transport, approvisionnement" },
  { id: "dep-qual", name: "Qualité & sécurité", description: "HSE, contrôle qualité, conformité" },
];

const positionDefs = [
  ["pos-dg", "Directeur général", "dep-dir", 320000],
  ["pos-drh", "Responsable RH", "dep-rh", 185000],
  ["pos-gp", "Gestionnaire paie", "dep-rh", 82000],
  ["pos-arh", "Assistante RH", "dep-rh", 56000],
  ["pos-daf", "Directeur administratif et financier", "dep-fin", 230000],
  ["pos-cpt", "Comptable", "dep-fin", 78000],
  ["pos-trs", "Trésorier", "dep-fin", 92000],
  ["pos-dp", "Directeur de production", "dep-prod", 210000],
  ["pos-cp", "Chef d'équipe production", "dep-prod", 105000],
  ["pos-op", "Opérateur de production", "dep-prod", 48000],
  ["pos-tech", "Technicien de maintenance", "dep-prod", 72000],
  ["pos-dc", "Directeur commercial", "dep-com", 215000],
  ["pos-ca", "Commercial grands comptes", "dep-com", 98000],
  ["pos-adv", "Assistant ADV", "dep-com", 58000],
  ["pos-dsi", "Responsable SI", "dep-it", 175000],
  ["pos-dev", "Développeur", "dep-it", 120000],
  ["pos-sup", "Technicien support", "dep-it", 70000],
  ["pos-rl", "Responsable logistique", "dep-log", 165000],
  ["pos-mag", "Magasinier", "dep-log", 54000],
  ["pos-chf", "Chauffeur livreur", "dep-log", 46000],
  ["pos-rq", "Responsable qualité", "dep-qual", 155000],
  ["pos-hse", "Agent HSE", "dep-qual", 74000],
];
const positions = positionDefs.map(([id, title, departmentId]) => ({ id, title, departmentId }));
const salaryOf = Object.fromEntries(positionDefs.map(([id, , , s]) => [id, s]));

// ---------- people ----------
const maleFirst = ["Karim", "Yacine", "Sofiane", "Walid", "Riad", "Nassim", "Mehdi", "Rafik", "Farid", "Hakim", "Amine", "Bilal", "Samir", "Toufik", "Mourad", "Zoheir", "Adel", "Anis", "Lotfi", "Nabil", "Redouane", "Salim"];
const femaleFirst = ["Amina", "Lynda", "Nadia", "Sara", "Meriem", "Salima", "Dalia", "Ines", "Leila", "Samia", "Yasmine", "Katia", "Houria", "Soraya", "Nawel", "Imane", "Farida", "Wassila"];
const lastNames = ["Benali", "Haddad", "Cherif", "Merabet", "Saadi", "Mansouri", "Zerrouki", "Belkacem", "Mahfoud", "Hamdi", "Toumi", "Boudjemaa", "Kaced", "Bouzid", "Khelifi", "Medjahed", "Slimani", "Ouali", "Bensalem", "Rahmani", "Aït Ahmed", "Moukhtar", "Lounis", "Ferhat", "Guerroudj", "Brahimi", "Djebbar", "Meziane", "Amrani", "Taleb"];

const tints = ["#0e6560", "#3b7bc4", "#a9558f", "#7a8b2e", "#c98a0b", "#6f7f8c", "#d2643a", "#b9a57c"];

// [id, firstName, lastName, gender, positionId, entityId, managerId, role, hireDate]
const core = [
  ["emp-001", "Karim", "Benali", "M", "pos-dg", "ent-1", null, "admin", "2014-03-01"],
  ["emp-002", "Amina", "Haddad", "F", "pos-drh", "ent-1", "emp-001", "hr", "2016-09-12"],
  ["emp-003", "Lynda", "Cherif", "F", "pos-gp", "ent-1", "emp-002", "accountant", "2019-02-04"],
  ["emp-004", "Yacine", "Merabet", "M", "pos-dp", "ent-2", "emp-001", "manager", "2015-06-01"],
  ["emp-005", "Nadia", "Saadi", "F", "pos-daf", "ent-1", "emp-001", "manager", "2017-01-15"],
  ["emp-006", "Mourad", "Bouzid", "M", "pos-dc", "ent-1", "emp-001", "manager", "2018-04-02"],
  ["emp-007", "Samir", "Khelifi", "M", "pos-dsi", "ent-1", "emp-001", "manager", "2018-09-03"],
  ["emp-008", "Houria", "Slimani", "F", "pos-rl", "ent-2", "emp-001", "manager", "2017-11-05"],
  ["emp-009", "Anis", "Medjahed", "M", "pos-rq", "ent-2", "emp-001", "manager", "2020-01-06"],
  ["emp-012", "Sofiane", "Mansouri", "M", "pos-op", "ent-2", "emp-004", "employee", "2021-05-10"],
];

const fillerPositions = [
  ["pos-cp", "ent-2", "dep-prod"], ["pos-cp", "ent-2", "dep-prod"], ["pos-op", "ent-2", "dep-prod"], ["pos-op", "ent-2", "dep-prod"],
  ["pos-op", "ent-2", "dep-prod"], ["pos-op", "ent-2", "dep-prod"], ["pos-op", "ent-2", "dep-prod"], ["pos-tech", "ent-2", "dep-prod"],
  ["pos-tech", "ent-2", "dep-prod"], ["pos-op", "ent-2", "dep-prod"], ["pos-arh", "ent-1", "dep-rh"], ["pos-cpt", "ent-1", "dep-fin"],
  ["pos-cpt", "ent-1", "dep-fin"], ["pos-trs", "ent-1", "dep-fin"], ["pos-ca", "ent-3", "dep-com"], ["pos-ca", "ent-1", "dep-com"],
  ["pos-ca", "ent-4", "dep-com"], ["pos-adv", "ent-1", "dep-com"], ["pos-adv", "ent-3", "dep-com"], ["pos-dev", "ent-1", "dep-it"],
  ["pos-dev", "ent-1", "dep-it"], ["pos-dev", "ent-1", "dep-it"], ["pos-sup", "ent-1", "dep-it"], ["pos-mag", "ent-2", "dep-log"],
  ["pos-mag", "ent-4", "dep-log"], ["pos-chf", "ent-2", "dep-log"], ["pos-chf", "ent-3", "dep-log"], ["pos-chf", "ent-4", "dep-log"],
  ["pos-hse", "ent-2", "dep-qual"], ["pos-hse", "ent-3", "dep-qual"], ["pos-op", "ent-2", "dep-prod"], ["pos-op", "ent-2", "dep-prod"],
  ["pos-cpt", "ent-3", "dep-fin"], ["pos-adv", "ent-4", "dep-com"], ["pos-sup", "ent-3", "dep-it"], ["pos-op", "ent-2", "dep-prod"],
  ["pos-mag", "ent-3", "dep-log"], ["pos-op", "ent-2", "dep-prod"],
];

const deptHead = {
  "dep-dir": "emp-001", "dep-rh": "emp-002", "dep-fin": "emp-005", "dep-prod": "emp-004",
  "dep-com": "emp-006", "dep-it": "emp-007", "dep-log": "emp-008", "dep-qual": "emp-009",
};
departments.forEach((d) => (d.headId = deptHead[d.id]));
const posDept = Object.fromEntries(positions.map((p) => [p.id, p.departmentId]));

const digits = (n) => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join("");

function buildEmployee(id, first, last, gender, positionId, entityId, managerId, role, hireDate, idx) {
  const base = Math.round((salaryOf[positionId] * (0.94 + rnd() * 0.14)) / 500) * 500;
  const years = Math.max(0, Math.floor((new Date(TODAY) - new Date(hireDate)) / 31557600000));
  const components = [];
  if (years >= 1) components.push({ code: "iep", label: "Indemnité d'ancienneté", amount: Math.round((base * Math.min(years, 15) * 0.01) / 10) * 10, cotisable: true, imposable: true });
  components.push({ code: "panier", label: "Indemnité de panier", amount: 4000, cotisable: true, imposable: true });
  if (["pos-chf", "pos-mag", "pos-op", "pos-tech", "pos-hse"].includes(positionId)) {
    components.push({ code: "transport", label: "Indemnité de transport", amount: 3000, cotisable: true, imposable: true });
  }
  if (rnd() > 0.55) components.push({ code: "rendement", label: "Prime de rendement", amount: Math.round((base * (0.06 + rnd() * 0.08)) / 100) * 100, cotisable: true, imposable: true });
  const contractType = idx > 40 ? pick(rnd, ["CDD", "CDD", "ANEM", "STAGE"]) : "CDI";
  const birthYear = between(rnd, 1970, 2000);
  return {
    id,
    matricule: `TI-${String(idx + 1).padStart(4, "0")}`,
    firstName: first,
    lastName: last,
    gender,
    birthDate: `${birthYear}-${String(between(rnd, 1, 12)).padStart(2, "0")}-${String(between(rnd, 1, 28)).padStart(2, "0")}`,
    birthPlace: pick(rnd, ["Alger", "Oran", "Constantine", "Blida", "Sétif", "Tizi Ouzou", "Béjaïa", "Batna"]),
    maritalStatus: pick(rnd, ["Marié(e)", "Marié(e)", "Célibataire", "Divorcé(e)"]),
    children: between(rnd, 0, 4),
    nin: `1${birthYear}${digits(13)}`.slice(0, 18),
    cnasNumber: digits(12),
    rib: `00799999${digits(12)}`,
    phone: `0${pick(rnd, [5, 6, 7])}${digits(1)} ${digits(2)} ${digits(2)} ${digits(2)}`.replace(/\s+/g, " "),
    email: `${first}.${last}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z.]/g, "") + "@tassili-industries.dz",
    address: `${between(rnd, 1, 120)} rue ${pick(rnd, ["Didouche Mourad", "Larbi Ben M'hidi", "des Frères Bouadou", "Hassiba Ben Bouali", "du 1er Novembre"])}, ${pick(rnd, ["Alger", "Oran", "Sétif", "Rouïba", "Kouba", "Bab Ezzouar"])}`,
    departmentId: posDept[positionId],
    positionId,
    entityId,
    managerId,
    role,
    status: "actif",
    hireDate,
    contract: {
      type: contractType,
      startDate: hireDate,
      endDate: contractType === "CDI" ? null : addDays(hireDate, 365),
      trialEnd: addDays(hireDate, 90),
    },
    baseSalary: base,
    components,
    tint: tints[idx % tints.length],
    leaveBalance: { annual: between(rnd, 6, 28), taken: between(rnd, 2, 18) },
  };
}

const employees = [];
core.forEach((c, i) => employees.push(buildEmployee(...c.slice(0, 9), i)));
let counter = 13;
fillerPositions.forEach(([positionId, entityId, depId], i) => {
  const female = rnd() > 0.45;
  const first = pick(rnd, female ? femaleFirst : maleFirst);
  const last = pick(rnd, lastNames);
  const id = `emp-${String(counter).padStart(3, "0")}`;
  counter += 1;
  const year = between(rnd, 2016, 2025);
  const hire = `${year}-${String(between(rnd, 1, 12)).padStart(2, "0")}-${String(between(rnd, 1, 25)).padStart(2, "0")}`;
  employees.push(buildEmployee(id, first, last, female ? "F" : "M", positionId, entityId, deptHead[depId], "employee", hire, employees.length));
});

// Planted data issues the payroll pre-flight should catch (demo script)
const byId = Object.fromEntries(employees.map((e) => [e.id, e]));
// new hire this month → prorata
employees[employees.length - 1].hireDate = "2026-10-12";
employees[employees.length - 1].contract = { type: "CDD", startDate: "2026-10-12", endDate: "2027-04-12", trialEnd: "2027-01-10" };
employees[employees.length - 1].status = "essai";
employees[employees.length - 1].components = [{ code: "panier", label: "Indemnité de panier", amount: 4000, cotisable: true, imposable: true }];
// missing CNAS number
employees[18].cnasNumber = "";
// below SNMG
employees[24].baseSalary = 22000;
employees[24].components = [];
// contract ending soon
employees[27].contract = { type: "CDD", startDate: "2025-11-17", endDate: "2026-11-16", trialEnd: "2026-02-15" };
employees[27].hireDate = "2025-11-17";
// someone on long sick leave
employees[30].status = "conge";
// leave an exited employee for history
employees.push({
  ...buildEmployee("emp-099", "Toufik", "Ferhat", "M", "pos-mag", "ent-2", "emp-008", "employee", "2019-05-06", employees.length),
  status: "sorti",
  exitDate: "2026-08-31",
  contract: { type: "CDI", startDate: "2019-05-06", endDate: null, trialEnd: "2019-08-06" },
});

// ---------- leave ----------
const leaveRequests = [];
let lrId = 1;
function addLeave(employeeId, type, from, to, status, reason = "", decidedBy = null) {
  const days = workingDays(from, to);
  leaveRequests.push({
    id: `lv-${String(lrId++).padStart(3, "0")}`,
    employeeId, type, from, to, days, status, reason,
    createdAt: addDays(from, -between(rnd, 6, 20)),
    decidedBy,
    decidedAt: status === "pending" ? null : addDays(from, -between(rnd, 1, 5)),
  });
}
// pending for the manager demo (Yacine Merabet's team) + HR
addLeave("emp-012", "annual", "2026-11-09", "2026-11-19", "pending", "Voyage familial à Tlemcen");
addLeave("emp-013", "annual", "2026-11-15", "2026-11-26", "pending", "Congé annuel");
addLeave("emp-014", "exceptional", "2026-11-03", "2026-11-04", "pending", "Mariage d'un proche");
addLeave("emp-016", "annual", "2026-12-20", "2026-12-31", "pending", "Fin d'année");
addLeave("emp-024", "sick", "2026-10-26", "2026-10-30", "pending", "Arrêt maladie — certificat joint");
addLeave("emp-031", "unpaid", "2026-11-22", "2026-12-04", "pending", "Démarches personnelles");
// history
for (let i = 0; i < 30; i++) {
  const e = pick(rnd, employees.filter((x) => x.status !== "sorti"));
  const start = addDays("2026-03-01", between(rnd, 0, 200));
  const type = pick(rnd, ["annual", "annual", "annual", "sick", "sick", "exceptional", "unpaid", "recovery"]);
  const len = type === "annual" ? between(rnd, 5, 14) : between(rnd, 1, 5);
  const to = addDays(start, len);
  const past = to < TODAY;
  addLeave(e.id, type, start, to, past ? (rnd() > 0.12 ? "taken" : "rejected") : "approved", "", deptHead[e.departmentId]);
}
// currently on leave this week
addLeave("emp-020", "annual", "2026-10-25", "2026-10-29", "approved", "", "emp-006");
addLeave("emp-022", "sick", "2026-10-26", "2026-10-28", "approved", "", "emp-007");
addLeave("emp-030", "sick", "2026-10-05", "2026-11-20", "approved", "Arrêt de longue durée", "emp-002");

// ---------- attendance (14 working days back + today) ----------
const attendance = [];
const days = listDays(addDays(TODAY, -20), TODAY).filter((d) => !isWeekend(d) && !holidayOn(d));
const active = employees.filter((e) => e.status !== "sorti");
for (const date of days) {
  for (const e of active) {
    const onLeave = leaveRequests.find((l) => l.employeeId === e.id && ["approved", "taken"].includes(l.status) && l.from <= date && date <= l.to);
    if (onLeave) {
      attendance.push({ id: `${date}:${e.id}`, employeeId: e.id, date, in: null, out: null, status: "leave" });
      continue;
    }
    if (e.hireDate > date) continue;
    const r = rnd();
    const isToday = date === TODAY;
    if (r < 0.04 && !isToday) attendance.push({ id: `${date}:${e.id}`, employeeId: e.id, date, in: null, out: null, status: "absent" });
    else if (r < 0.14) {
      const m = between(rnd, 12, 55);
      attendance.push({ id: `${date}:${e.id}`, employeeId: e.id, date, in: `08:${String(m).padStart(2, "0")}`, out: isToday ? null : "17:0" + between(rnd, 0, 9), status: "late" });
    } else {
      const m = between(rnd, 20, 59);
      attendance.push({ id: `${date}:${e.id}`, employeeId: e.id, date, in: `07:${String(m).padStart(2, "0")}`, out: isToday ? null : `17:${String(between(rnd, 0, 40)).padStart(2, "0")}`, status: e.id === "emp-001" && rnd() > 0.7 ? "remote" : "present" });
    }
  }
}

// ---------- loans ----------
const loans = [
  { id: "ln-001", employeeId: "emp-014", type: "avance", total: 60000, monthly: 10000, remaining: 40000, status: "active", startDate: "2026-08-01", reason: "Frais de scolarité" },
  { id: "ln-002", employeeId: "emp-017", type: "pret_social", total: 300000, monthly: 20000, remaining: 220000, status: "active", startDate: "2026-02-01", reason: "Achat véhicule" },
  { id: "ln-003", employeeId: "emp-021", type: "avance", total: 25000, monthly: 12500, remaining: 12500, status: "active", startDate: "2026-09-01", reason: "Urgence médicale" },
  { id: "ln-004", employeeId: "emp-026", type: "pret_social", total: 400000, monthly: 25000, remaining: 300000, status: "active", startDate: "2026-01-01", reason: "Logement" },
  { id: "ln-005", employeeId: "emp-019", type: "avance", total: 40000, monthly: 10000, remaining: 40000, status: "pending", startDate: "2026-11-01", reason: "Aïd — dépenses familiales" },
  { id: "ln-006", employeeId: "emp-028", type: "avance", total: 15000, monthly: 5000, remaining: 0, status: "closed", startDate: "2026-03-01", reason: "" },
];

// ---------- payroll runs (Apr → Sep 2026) ----------
function runFor(period, status) {
  const lines = employees
    .filter((e) => e.hireDate <= `${period}-28` && !(e.exitDate && e.exitDate < `${period}-01`))
    .map((e) => {
      const loan = loans.find((l) => l.employeeId === e.id && l.status === "active" && l.startDate.slice(0, 7) <= period);
      const slip = computePayslip({ baseSalary: e.baseSalary, components: e.components, loanDeduction: loan?.monthly ?? 0 }, defaultParams);
      return { employeeId: e.id, ...slip };
    });
  const sum = (k) => Math.round(lines.reduce((s, l) => s + l[k], 0) * 100) / 100;
  const [y, m] = period.split("-").map(Number);
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return {
    id: `run-${period}`,
    period,
    status,
    createdAt: `${nextMonth}-02`,
    validatedAt: `${nextMonth}-03`,
    paidAt: `${nextMonth}-05`,
    declaredAt: status === "declared" ? `${nextMonth}-15` : null,
    headcount: lines.length,
    lines,
    totals: { gross: sum("gross"), cnasEmployee: sum("cnasEmployee"), irg: sum("irg"), net: sum("net"), cnasEmployer: sum("cnasEmployer"), employerCost: sum("employerCost") },
  };
}
const payrollRuns = [
  runFor("2026-04", "declared"),
  runFor("2026-05", "declared"),
  runFor("2026-06", "declared"),
  runFor("2026-07", "declared"),
  runFor("2026-08", "declared"),
  runFor("2026-09", "paid"),
];

// ---------- requests (demandes) ----------
const requests = [
  { id: "rq-001", employeeId: "emp-012", kind: "attestation_travail", status: "pending", note: "Pour dossier bancaire", createdAt: "2026-10-25" },
  { id: "rq-002", employeeId: "emp-015", kind: "attestation_salaire", status: "pending", note: "Demande de visa", createdAt: "2026-10-24" },
  { id: "rq-003", employeeId: "emp-020", kind: "changement_info", status: "pending", note: "Nouvelle adresse + RIB", createdAt: "2026-10-23" },
  { id: "rq-004", employeeId: "emp-023", kind: "materiel", status: "approved", note: "Casque de sécurité neuf", createdAt: "2026-10-12", decidedAt: "2026-10-13" },
  { id: "rq-005", employeeId: "emp-018", kind: "attestation_travail", status: "approved", note: "", createdAt: "2026-10-02", decidedAt: "2026-10-02" },
  { id: "rq-006", employeeId: "emp-027", kind: "avance", status: "rejected", note: "Avance déjà en cours", createdAt: "2026-09-29", decidedAt: "2026-09-30" },
];

// ---------- documents ----------
const documents = [
  { id: "doc-001", name: "Règlement intérieur 2026.pdf", folder: "Entreprise", kind: "pdf", size: 1240000, uploadedAt: "2026-01-05", expiresAt: null, ownerId: "emp-002" },
  { id: "doc-002", name: "Convention collective.pdf", folder: "Entreprise", kind: "pdf", size: 3180000, uploadedAt: "2025-09-12", expiresAt: null, ownerId: "emp-002" },
  { id: "doc-003", name: "Politique congés.docx", folder: "Entreprise", kind: "doc", size: 220000, uploadedAt: "2026-02-18", expiresAt: null, ownerId: "emp-002" },
  { id: "doc-004", name: "Modèle contrat CDI.docx", folder: "Modèles", kind: "doc", size: 98000, uploadedAt: "2026-01-12", expiresAt: null, ownerId: "emp-002" },
  { id: "doc-005", name: "Modèle attestation de travail.docx", folder: "Modèles", kind: "doc", size: 41000, uploadedAt: "2026-01-12", expiresAt: null, ownerId: "emp-002" },
  { id: "doc-006", name: "Certificat médical — S. Mansouri.pdf", folder: "Dossiers salariés", kind: "pdf", size: 310000, uploadedAt: "2026-09-02", expiresAt: null, ownerId: "emp-012" },
  { id: "doc-007", name: "Contrat CDD — K. Lounis.pdf", folder: "Dossiers salariés", kind: "pdf", size: 420000, uploadedAt: "2025-11-17", expiresAt: "2026-11-16", ownerId: "emp-040" },
  { id: "doc-008", name: "Permis de conduire — chauffeurs.xlsx", folder: "Conformité", kind: "xls", size: 88000, uploadedAt: "2026-06-30", expiresAt: "2026-12-15", ownerId: "emp-008" },
  { id: "doc-009", name: "Attestation d'assurance flotte.pdf", folder: "Conformité", kind: "pdf", size: 560000, uploadedAt: "2026-01-20", expiresAt: "2026-12-31", ownerId: "emp-005" },
  { id: "doc-010", name: "PV élection délégués du personnel.pdf", folder: "Conformité", kind: "pdf", size: 720000, uploadedAt: "2025-05-14", expiresAt: null, ownerId: "emp-002" },
];

// ---------- trainings ----------
const trainings = [
  { id: "tr-001", title: "Sécurité incendie et évacuation", provider: "Protection Civile — Alger", from: "2026-11-10", to: "2026-11-11", seats: 20, participantIds: ["emp-012", "emp-013", "emp-014", "emp-016", "emp-017"], status: "planned", cost: 120000, mandatory: true },
  { id: "tr-002", title: "Excel avancé pour la finance", provider: "Cabinet Ibn Khaldoun", from: "2026-10-12", to: "2026-10-14", seats: 12, participantIds: ["emp-005", "emp-023", "emp-024"], status: "done", cost: 85000, mandatory: false },
  { id: "tr-003", title: "Management d'équipe", provider: "ESI Formation Continue", from: "2026-12-02", to: "2026-12-04", seats: 10, participantIds: ["emp-004", "emp-006", "emp-007", "emp-008", "emp-009"], status: "planned", cost: 240000, mandatory: false },
  { id: "tr-004", title: "Habilitation électrique", provider: "SONELGAZ Formation", from: "2026-09-08", to: "2026-09-09", seats: 8, participantIds: ["emp-019", "emp-020"], status: "done", cost: 96000, mandatory: true },
  { id: "tr-005", title: "Droit du travail — mises à jour 2026", provider: "Cabinet Benaissa & associés", from: "2026-11-24", to: "2026-11-24", seats: 15, participantIds: ["emp-002", "emp-003"], status: "planned", cost: 45000, mandatory: false },
];

// ---------- goals ----------
const goals = [
  { id: "gl-001", employeeId: "emp-004", reviewerId: "emp-001", title: "Réduire le taux de rebut de la ligne 02 à 1,8 %", progress: 64, dueDate: "2026-12-31", status: "on_track", quarter: "T4 2026" },
  { id: "gl-002", employeeId: "emp-006", reviewerId: "emp-001", title: "Ouvrir 12 nouveaux comptes grande distribution", progress: 42, dueDate: "2026-12-31", status: "at_risk", quarter: "T4 2026" },
  { id: "gl-003", employeeId: "emp-007", reviewerId: "emp-001", title: "Migrer l'ERP vers le nouveau serveur", progress: 85, dueDate: "2026-11-30", status: "on_track", quarter: "T4 2026" },
  { id: "gl-004", employeeId: "emp-002", reviewerId: "emp-001", title: "Digitaliser 100 % des dossiers salariés", progress: 58, dueDate: "2026-12-31", status: "on_track", quarter: "T4 2026" },
  { id: "gl-005", employeeId: "emp-008", reviewerId: "emp-001", title: "Ramener les ruptures de stock sous 2 %", progress: 30, dueDate: "2026-12-15", status: "at_risk", quarter: "T4 2026" },
  { id: "gl-006", employeeId: "emp-009", reviewerId: "emp-001", title: "Obtenir la certification ISO 22000", progress: 90, dueDate: "2026-11-15", status: "on_track", quarter: "T4 2026" },
  { id: "gl-007", employeeId: "emp-012", reviewerId: "emp-004", title: "Zéro incident de sécurité ce trimestre", progress: 100, dueDate: "2026-12-31", status: "done", quarter: "T4 2026" },
  { id: "gl-008", employeeId: "emp-005", reviewerId: "emp-001", title: "Clôture comptable en J+5", progress: 20, dueDate: "2026-12-31", status: "behind", quarter: "T4 2026" },
];

// ---------- announcements ----------
const announcements = [
  { id: "an-001", title: "Nouveau barème IRG : ce qui change sur vos bulletins", body: "La loi de finances 2026 laisse le barème salarial inchangé. Le SNMG passe à 24 000 DA depuis le 1er janvier : les bulletins ont été recalculés.", authorId: "emp-002", date: "2026-10-20", pinned: true, audience: "Tous" },
  { id: "an-002", title: "Fermeture exceptionnelle le 1er novembre", body: "L'entreprise sera fermée le dimanche 1er novembre (Anniversaire de la Révolution). Reprise lundi 2 novembre à 8 h.", authorId: "emp-002", date: "2026-10-18", pinned: false, audience: "Tous" },
  { id: "an-003", title: "Bienvenue à Amel dans l'équipe Production", body: "Amel rejoint la ligne 01 en tant qu'opératrice. Accueillons-la comme il se doit !", authorId: "emp-004", date: "2026-10-12", pinned: false, audience: "Production" },
  { id: "an-004", title: "Campagne de vaccination antigrippale", body: "La médecine du travail organise la vaccination les 4 et 5 novembre à l'infirmerie du siège et de l'usine.", authorId: "emp-009", date: "2026-10-09", pinned: false, audience: "Tous" },
];

// ---------- jobs / candidates ----------
const jobs = [
  { id: "job-001", title: "Développeur full-stack", departmentId: "dep-it", entityId: "ent-1", status: "open", openedAt: "2026-09-20", headcount: 1 },
  { id: "job-002", title: "Opérateur de production (x3)", departmentId: "dep-prod", entityId: "ent-2", status: "open", openedAt: "2026-10-01", headcount: 3 },
  { id: "job-003", title: "Chargé de recrutement", departmentId: "dep-rh", entityId: "ent-1", status: "paused", openedAt: "2026-08-15", headcount: 1 },
];
const cand = (id, jobId, name, stage, score, source, appliedAt) => ({ id, jobId, name, stage, score, source, appliedAt });
const candidates = [
  cand("cd-001", "job-001", "Rania Boukhari", "interview", 88, "LinkedIn", "2026-10-02"),
  cand("cd-002", "job-001", "Massinissa Ait Said", "screening", 74, "ANEM", "2026-10-06"),
  cand("cd-003", "job-001", "Hamza Derradji", "offer", 93, "Recommandation", "2026-09-26"),
  cand("cd-004", "job-001", "Ilhem Bouras", "new", 66, "Emploitic", "2026-10-22"),
  cand("cd-005", "job-001", "Walid Kadri", "rejected", 41, "Emploitic", "2026-09-30"),
  cand("cd-006", "job-002", "Abdelkader Zitouni", "interview", 79, "ANEM", "2026-10-08"),
  cand("cd-007", "job-002", "Mohamed Larbi", "screening", 70, "ANEM", "2026-10-11"),
  cand("cd-008", "job-002", "Fouad Mekideche", "new", 62, "Emploitic", "2026-10-24"),
  cand("cd-009", "job-002", "Sabrina Taibi", "new", 68, "LinkedIn", "2026-10-25"),
  cand("cd-010", "job-002", "Younes Hadjadj", "hired", 90, "ANEM", "2026-09-28"),
];

// ---------- notifications / audit / declarations ----------
const notifications = [
  { id: "nt-001", title: "6 demandes de congé en attente", body: "Dont 3 de votre équipe.", date: "2026-10-27", read: false, href: "/app/inbox", roles: ["admin", "hr", "manager"] },
  { id: "nt-002", title: "Paie d'octobre : préparation ouverte", body: "Les variables du mois sont à saisir avant le 5 novembre.", date: "2026-10-26", read: false, href: "/app/payroll", roles: ["admin", "hr", "accountant"] },
  { id: "nt-003", title: "N° CNAS manquant", body: "1 dossier salarié est incomplet.", date: "2026-10-25", read: false, href: "/app/employees", roles: ["hr", "admin"] },
  { id: "nt-004", title: "Votre bulletin de septembre est disponible", body: "Net à payer : consultez le détail.", date: "2026-10-05", read: true, href: "/app/payslips", roles: ["employee", "manager", "hr", "admin", "accountant"] },
  { id: "nt-005", title: "G50 d'octobre à déposer avant le 20/11", body: "Rappel de l'échéance fiscale.", date: "2026-10-24", read: true, href: "/app/compliance", roles: ["admin", "accountant"] },
];

const audit = [
  { id: "au-001", at: "2026-10-26T16:42:00", actorId: "emp-002", action: "Salaire consulté", target: "Nadia Saadi", detail: "Fiche salarié · onglet Paie" },
  { id: "au-002", at: "2026-10-26T11:03:00", actorId: "emp-004", action: "Congé approuvé", target: "Sofiane Mansouri", detail: "1 → 5 nov. (5 j)" },
  { id: "au-003", at: "2026-10-25T09:20:00", actorId: "emp-003", action: "Variables de paie modifiées", target: "Paie octobre 2026", detail: "3 primes ajoutées" },
  { id: "au-004", at: "2026-10-22T14:12:00", actorId: "emp-001", action: "Paie validée", target: "Paie septembre 2026", detail: "48 bulletins" },
];

const declarations = [
  { id: "dc-g50-2026-09", kind: "G50", period: "2026-09", dueDate: "2026-10-20", status: "filed", reference: "G50-2026-09-0412" },
  { id: "dc-cnas-2026-09", kind: "CNAS", period: "2026-09", dueDate: "2026-10-20", status: "filed", reference: "CNAS-0988211" },
  { id: "dc-g50-2026-10", kind: "G50", period: "2026-10", dueDate: "2026-11-20", status: "todo", reference: null },
  { id: "dc-cnas-2026-10", kind: "CNAS", period: "2026-10", dueDate: "2026-11-20", status: "todo", reference: null },
  { id: "dc-g29-2026", kind: "G29", period: "2026", dueDate: "2027-04-30", status: "todo", reference: null },
  { id: "dc-das-2026", kind: "DAS", period: "2026", dueDate: "2027-01-31", status: "todo", reference: null },
];

export function createSeed() {
  return {
    version: SEED_VERSION,
    company,
    entities,
    departments,
    positions,
    employees,
    leaveRequests,
    attendance,
    loans,
    payrollRuns,
    requests,
    documents,
    trainings,
    goals,
    announcements,
    jobs,
    candidates,
    notifications,
    audit,
    declarations,
    settings: { payroll: defaultParams, theme: "light", density: "standard" },
  };
}

export const SEED = createSeed();
