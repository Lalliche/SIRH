import { TODAY } from "@/lib/clock";
import { diffDays } from "@/lib/dates";

export const STAGES = [
  { key: "new", label: "Nouveau", tone: "neutral", hint: "Candidatures reçues" },
  { key: "screening", label: "Présélection", tone: "info", hint: "CV et appel de qualification" },
  { key: "interview", label: "Entretien", tone: "brand", hint: "Entretiens RH et technique" },
  { key: "offer", label: "Offre", tone: "warning", hint: "Proposition envoyée" },
  { key: "hired", label: "Embauché", tone: "success", hint: "Offre acceptée" },
  { key: "rejected", label: "Refusé", tone: "danger", hint: "Candidature clôturée" },
];
export const STAGE_BY_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s]));
export const stageIndex = (key) => STAGES.findIndex((s) => s.key === key);

export const SOURCES = ["ANEM", "Emploitic", "LinkedIn", "Recommandation", "Candidature spontanée"];
export const REJECT_REASONS = ["Profil non adapté", "Prétentions salariales trop élevées", "Pas de disponibilité", "A décliné l'offre", "Autre"];

export const JOB_STATUS = {
  draft: { label: "Brouillon", tone: "neutral" },
  open: { label: "Ouvert", tone: "success" },
  paused: { label: "En pause", tone: "warning" },
  closed: { label: "Clôturé", tone: "neutral" },
};

export const CRITERIA = [
  { key: "technique", label: "Compétences techniques" },
  { key: "communication", label: "Communication" },
  { key: "culture", label: "Adéquation à la culture" },
  { key: "motivation", label: "Motivation" },
];

export const daysInStage = (c) => diffDays(c.stageAt ?? c.appliedAt, TODAY);

export function scorecardAverage(c) {
  const vals = Object.values(c.scorecard ?? {}).filter((v) => v > 0);
  return vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null;
}

export function stageCounts(candidates) {
  const counts = Object.fromEntries(STAGES.map((s) => [s.key, 0]));
  candidates.forEach((c) => { counts[c.stage] = (counts[c.stage] ?? 0) + 1; });
  return counts;
}

// Cumulative funnel: how many candidates reached each step (rejected only count as "reçues").
export function funnelOf(candidates) {
  const reached = (min) => candidates.filter((c) => c.stage !== "rejected" && stageIndex(c.stage) >= min).length;
  return [
    { label: "Reçues", value: candidates.length },
    { label: "Présélection", value: reached(1) },
    { label: "Entretien", value: reached(2) },
    { label: "Offre", value: reached(3) },
    { label: "Embauchés", value: reached(4) },
  ];
}

export function splitName(name) {
  const [first, ...rest] = name.trim().split(/\s+/);
  return { firstName: first ?? "", lastName: rest.join(" ") };
}

/** Link to the add-employee wizard prefilled from a hired candidate. */
export function employeeLink(candidate, job) {
  const { firstName, lastName } = splitName(candidate.name);
  const p = new URLSearchParams({
    from: "recruitment",
    candidateId: candidate.id,
    firstName,
    lastName,
    email: candidate.email ?? "",
    phone: candidate.phone ?? "",
    positionTitle: job?.title ?? "",
    departmentId: job?.departmentId ?? "",
    entityId: job?.entityId ?? "",
    contractType: job?.contractType ?? "CDI",
    hireDate: TODAY,
  });
  return `/app/employees/new?${p.toString()}`;
}
